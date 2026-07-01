import * as vscode from 'vscode';
import { FaultLineConfig, FailureHandler } from '../../domain/types/index';
import { Logger } from '../../shared/utils/logger';
import { sanitizePII } from '../security/pii';

interface TerminalShellExecutionStartEvent {
    read(): AsyncIterable<string>;
    __faultline_output?: string;
}

interface TerminalShellExecutionEndEvent {
    exitCode: number | undefined;
    commandLine?: { value: string };
    __faultline_output?: string;
}

interface CustomWindow {
    onDidStartTerminalShellExecution?: (listener: (e: TerminalShellExecutionStartEvent) => void) => vscode.Disposable;
    onDidEndTerminalShellExecution?: (listener: (e: TerminalShellExecutionEndEvent) => void) => vscode.Disposable;
}

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
        const customWindow = vscode.window as unknown as CustomWindow;
        const onDidStartTerminalShellExecution = customWindow.onDidStartTerminalShellExecution;
        if (onDidStartTerminalShellExecution) {
            disposables.push(
                onDidStartTerminalShellExecution((e: TerminalShellExecutionStartEvent) => {
                    try {
                        let output = '';
                        const stream = e.read();
                        (async () => {
                            for await (const chunk of stream) {
                                output += chunk;
                                if (output.length > 10000) output = output.slice(-10000); // keep last 10k bytes
                            }
                            e.__faultline_output = output;
                        })().catch(() => {});
                    } catch (err) {
                        this.logger.debug('Failed to attach terminal stream reader');
                    }
                })
            );
        }
    
        const onDidEndTerminalShellExecution = customWindow.onDidEndTerminalShellExecution;
        if (onDidEndTerminalShellExecution) {
            disposables.push(
                onDidEndTerminalShellExecution((e: TerminalShellExecutionEndEvent) => {
                    try {
                        const configObj = this.config();
                        const cfg = configObj.detection;
                        const code = e.exitCode;

                        if (!cfg.sources.has('shell')) {
                            return;
                        }

                        if (code !== undefined && code !== 0) {
                            // Command lines routinely contain inline secrets (e.g. `--token=…`);
                            // redact before the label is stored in history or written to logs.
                            const label = sanitizePII(e.commandLine?.value || 'Terminal Command');
                            const output = sanitizePII(e.__faultline_output || '');
                            this.onFailure({ source: 'shell', label, output, timestamp: Date.now() });
                        }
                    } catch (err) {
                        this.logger.error('Unhandled rejection in Terminal Detector', err);
                    }
                })
            );
        }

        // Detect failure via terminal closure (fallback, legacy)
        disposables.push(
            vscode.window.onDidCloseTerminal((t: vscode.Terminal) => {
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
