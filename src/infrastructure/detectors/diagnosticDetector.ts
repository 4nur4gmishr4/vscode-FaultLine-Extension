import * as vscode from 'vscode';
import { FaultLineConfig, FailureHandler } from '../../domain/types/index';

const CLEANUP_INTERVAL_MS = 60000;

/**
 * Detects new errors in the code diagnostics.
 */
export class DiagnosticDetector {
    private readonly lastDiagnosticCounts = new Map<string, number>();
    private diagTimeout: NodeJS.Timeout | null = null;

    constructor(
        private readonly config: () => FaultLineConfig,
        private readonly onFailure: FailureHandler
    ) {}

    public register(disposables: vscode.Disposable[]): void {
        disposables.push(
            vscode.languages.onDidChangeDiagnostics((e) => {
                if (this.diagTimeout) {
                    clearTimeout(this.diagTimeout);
                }

                this.diagTimeout = setTimeout(() => {
                    const configObj = this.config();
                    const cfg = configObj.detection;
                    if (!cfg.sources.has('diagnostics')) {
                        return;
                    }

                    for (const uri of e.uris) {
                        const diag = vscode.languages.getDiagnostics(uri);
                        const errorCount = diag.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
                        const key = uri.toString();
                        const lastCount = this.lastDiagnosticCounts.get(key) ?? 0;

                        if (errorCount > lastCount && (errorCount - lastCount) >= cfg.diagnosticsThreshold) {
                            const fileName = uri.path.split('/').pop() ?? 'File';
                            this.onFailure({
                                source: 'diagnostics',
                                label: `${fileName}: ${errorCount} errors`,
                                timestamp: Date.now()
                            });
                        }
                        this.lastDiagnosticCounts.set(key, errorCount);
                    }
                }, 500);
            })
        );

        // Cleanup interval
        const diagCleanupInterval = setInterval(() => {
            const live = new Set(vscode.workspace.textDocuments.map(d => d.uri.toString()));
            for (const key of this.lastDiagnosticCounts.keys()) {
                if (!live.has(key)) {
                    this.lastDiagnosticCounts.delete(key);
                }
            }
        }, CLEANUP_INTERVAL_MS);

        if (diagCleanupInterval.unref) {
            diagCleanupInterval.unref();
        }

        disposables.push({ dispose: () => {
            clearInterval(diagCleanupInterval);
            if (this.diagTimeout) {
                clearTimeout(this.diagTimeout);
            }
        }});
    }
}
