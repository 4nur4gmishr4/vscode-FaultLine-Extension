/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as vscode from 'vscode';
import { FaultLineConfig, FailureHandler } from '../types';
import { Logger } from '../utils/logger';

/**
 * Detects failures in VS Code terminals.
 */
export class TerminalDetector {
    constructor(
        private readonly config: () => FaultLineConfig,
        private readonly logger: Logger,
        private readonly onFailure: FailureHandler
    ) {}

    public register(disposables: vscode.Disposable[]): void {
        // Detect failure via shell integration (reliable, modern)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onDidEndTerminalShellExecution = (vscode.window as any).onDidEndTerminalShellExecution;
        if (onDidEndTerminalShellExecution) {
            disposables.push(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onDidEndTerminalShellExecution((e: any) => {
                    try {
                        const configObj = this.config();
                        const cfg = configObj.detection;
                        const code = e.exitCode;

                        if (!cfg.sources.has('shell')) {
                            return;
                        }

                        if (code !== undefined && code !== 0) {
                            const label = e.commandLine?.value || 'Terminal Command';
                            this.onFailure({ source: 'shell', label, timestamp: Date.now() });
                        }
                    } catch (err) {
                        this.logger.error('Unhandled rejection in Terminal Detector', err);
                    }
                })
            );
        }

        // Detect failure via terminal closure (fallback, legacy)
        disposables.push(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vscode.window.onDidCloseTerminal((t: any) => {
                try {
                    const cfg = this.config().detection;
                    if (!cfg.sources.has('terminal')) {
                        return;
                    }

                    const code = t.exitStatus?.code;
                    if (code !== undefined && code !== 0) {
                        this.onFailure({ source: 'terminal', label: t.name, timestamp: Date.now() });
                    }
                } catch (err) {
                    this.logger.error('Unhandled rejection in Terminal Detector', err);
                }
            })
        );
    }
}
