import * as vscode from 'vscode';
import { FaultLineConfig, FailureHandler } from '../../domain/types/index';

const CLEANUP_INTERVAL_MS = 60000;

/**
 * Detects new errors in the code diagnostics.
 */
export class DiagnosticDetector {
    private readonly lastDiagnosticCounts = new Map<string, number>();
    private readonly lastDocEditTimes = new Map<string, number>();
    private readonly pendingUris = new Map<string, vscode.Uri>();
    private diagTimeout: NodeJS.Timeout | null = null;

    constructor(
        private readonly config: () => FaultLineConfig,
        private readonly onFailure: FailureHandler,
        private readonly onError?: (err: unknown) => void
    ) {}

    public register(disposables: vscode.Disposable[]): void {
        const onChange = vscode.languages?.onDidChangeDiagnostics;
        if (typeof onChange !== 'function') {
            this.onError?.(new Error('vscode.languages.onDidChangeDiagnostics is unavailable'));
            return;
        }

        const onDocChange = vscode.workspace?.onDidChangeTextDocument;
        if (typeof onDocChange === 'function') {
            disposables.push(
                onDocChange.call(vscode.workspace, (e: vscode.TextDocumentChangeEvent) => {
                    if (e?.document?.uri) {
                        this.lastDocEditTimes.set(e.document.uri.toString(), Date.now());
                    }
                })
            );
        }

        disposables.push(
            onChange.call(vscode.languages, (e: vscode.DiagnosticChangeEvent) => {
                const uris = e?.uris;
                if (Array.isArray(uris)) {
                    for (const uri of uris as readonly vscode.Uri[]) {
                        this.pendingUris.set(uri.toString(), uri);
                    }
                }

                if (this.diagTimeout) {
                    clearTimeout(this.diagTimeout);
                }

                this.diagTimeout = setTimeout(() => {
                    this.diagTimeout = null;
                    try {
                        const urisToProcess = Array.from(this.pendingUris.values());
                        this.pendingUris.clear();
                        this.processDiagnosticUris(urisToProcess);
                    } catch (err) {
                        this.onError?.(err);
                    }
                }, 500);
            })
        );

        // Cleanup interval
        const diagCleanupInterval = setInterval(() => {
            try {
                const live = new Set(vscode.workspace.textDocuments.map(d => d.uri.toString()));
                for (const key of this.lastDiagnosticCounts.keys()) {
                    if (!live.has(key)) {
                        this.lastDiagnosticCounts.delete(key);
                        this.lastDocEditTimes.delete(key);
                    }
                }
            } catch {
                // Workspace may be shutting down; ignore cleanup errors.
            }
        }, CLEANUP_INTERVAL_MS);

        if (diagCleanupInterval.unref) {
            diagCleanupInterval.unref();
        }

        disposables.push({ dispose: () => {
            clearInterval(diagCleanupInterval);
            if (this.diagTimeout) {
                clearTimeout(this.diagTimeout);
                this.diagTimeout = null;
            }
            this.pendingUris.clear();
        }});
    }

    private processDiagnosticUris(uris: vscode.Uri[]): void {
        const configObj = this.config();
        const cfg = configObj.detection;
        if (!cfg.sources.has('diagnostics')) {
            return;
        }

        const activeUri = vscode.window?.activeTextEditor?.document?.uri?.toString();
        const urisToRequeue: vscode.Uri[] = [];

        for (const uri of uris) {
            const key = uri.toString();
            const lastEdit = this.lastDocEditTimes.get(key);
            if (activeUri === key && lastEdit && Date.now() - lastEdit < 1000) {
                urisToRequeue.push(uri);
                continue;
            }

            const diag = vscode.languages.getDiagnostics(uri);
            const errorCount = diag.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
            const lastCount = this.lastDiagnosticCounts.get(key) ?? 0;

            if (errorCount > lastCount && (errorCount - lastCount) >= cfg.diagnosticsThreshold) {
                const parts = (uri.path || '').split('/').filter(Boolean);
                const fileName = parts.pop() ?? 'File';
                this.onFailure({
                    source: 'diagnostics',
                    label: `${fileName}: ${errorCount} errors`,
                    timestamp: Date.now()
                });
            }
            this.lastDiagnosticCounts.set(key, errorCount);
        }

        if (urisToRequeue.length > 0) {
            for (const uri of urisToRequeue) {
                this.pendingUris.set(uri.toString(), uri);
            }
            if (!this.diagTimeout) {
                this.diagTimeout = setTimeout(() => {
                    this.diagTimeout = null;
                    const remaining = Array.from(this.pendingUris.values());
                    this.pendingUris.clear();
                    this.processDiagnosticUris(remaining);
                }, 1000);
            }
        }
    }
}
