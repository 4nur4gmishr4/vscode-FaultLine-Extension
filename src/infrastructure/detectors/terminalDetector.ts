import * as vscode from 'vscode';
import { FaultLineConfig, FailureHandler } from '../../domain/types/index';
import { Logger } from '../../shared/utils/logger';
import { sanitizePII } from '../security/pii';

/** Cap buffered shell output to bound memory / AI payload size. */
const MAX_OUTPUT_CHARS = 10_000;

/** Per-execution buffer keyed by the VS Code execution object. */
interface ExecutionBuffer {
    /** Accumulated terminal data from `execution.read()`. */
    output: string;
    /** Resolves when the read stream ends (or fails). */
    done: Promise<void>;
}

/**
 * Detects failures in VS Code terminals.
 */
export class TerminalDetector {
    /**
     * Maps in-flight shell executions to their buffered stdout/stderr stream.
     * Keyed by `TerminalShellExecution` so concurrent terminals/commands do not mix.
     */
    private readonly buffers = new WeakMap<vscode.TerminalShellExecution, ExecutionBuffer>();

    constructor(
        private readonly config: () => FaultLineConfig,
        private readonly logger: Logger,
        private readonly onFailure: FailureHandler
    ) {}

    public register(disposables: vscode.Disposable[]): void {
        // Shell integration APIs (VS Code >= 1.93). Guard so missing APIs never block activation.
        const startShell = vscode.window.onDidStartTerminalShellExecution;
        const endShell = vscode.window.onDidEndTerminalShellExecution;

        if (typeof startShell === 'function') {
            disposables.push(
                startShell.call(vscode.window, (e: vscode.TerminalShellExecutionStartEvent) => {
                    try {
                        this.beginCapture(e.execution);
                    } catch (err) {
                        this.logger.debug(
                            `Failed to attach terminal stream reader: ${err instanceof Error ? err.message : String(err)}`
                        );
                    }
                })
            );
        } else {
            this.logger.warn(
                'onDidStartTerminalShellExecution is unavailable. Shell command capture is limited. Update VS Code to 1.93+.'
            );
        }

        if (typeof endShell === 'function') {
            disposables.push(
                endShell.call(vscode.window, (e: vscode.TerminalShellExecutionEndEvent) => {
                    void this.handleShellEnd(e).catch((err: unknown) => {
                        this.logger.error('Unhandled rejection in Terminal Detector', err);
                    });
                })
            );
        }

        // Detect failure via terminal closure (fallback)
        const closeTerminal = vscode.window.onDidCloseTerminal;
        if (typeof closeTerminal === 'function') {
            disposables.push(
                closeTerminal.call(vscode.window, (t: vscode.Terminal) => {
                    try {
                        const cfg = this.config().detection;
                        if (!cfg.sources.has('terminal')) {
                            return;
                        }

                        const code = t.exitStatus?.code;
                        if (code !== undefined && code !== 0) {
                            this.onFailure({
                                source: 'terminal',
                                label: t.name,
                                timestamp: Date.now()
                            });
                        }
                    } catch (err) {
                        this.logger.error('Terminal close handler failed', err);
                    }
                })
            );
        }
    }

    /**
     * Start buffering `execution.read()` immediately so no post-start output is missed.
     * Must be called from the start event handler (see VS Code TerminalShellExecution docs).
     */
    private beginCapture(execution: vscode.TerminalShellExecution): void {
        const buffer: ExecutionBuffer = {
            output: '',
            done: Promise.resolve()
        };

        buffer.done = (async () => {
            try {
                for await (const chunk of execution.read()) {
                    buffer.output += chunk;
                    if (buffer.output.length > MAX_OUTPUT_CHARS) {
                        buffer.output = buffer.output.slice(-MAX_OUTPUT_CHARS);
                    }
                }
            } catch (err) {
                this.logger.debug(
                    `Terminal stream read ended with error: ${err instanceof Error ? err.message : String(err)}`
                );
            }
        })();

        this.buffers.set(execution, buffer);
    }

    /**
     * On shell command end: wait for the stream to drain, then report non-zero exit as `shell` failure.
     * Preserves existing source gating, PII sanitization, and FailureEvent shape for FaultLineRuntime.
     */
    private async handleShellEnd(e: vscode.TerminalShellExecutionEndEvent): Promise<void> {
        const cfg = this.config().detection;
        if (!cfg.sources.has('shell')) {
            return;
        }

        const code = e.exitCode;
        const buffer = this.buffers.get(e.execution);
        if (buffer) {
            // End can fire before the last read() chunks are delivered; await drain.
            await buffer.done;
        }

        if (code === undefined || code === 0) {
            return;
        }

        // Prefer end-time commandLine (docs: may be more accurate after end).
        const rawCommand = e.execution.commandLine?.value || 'Terminal Command';
        const label = sanitizePII(rawCommand);
        const output = sanitizePII(buffer?.output ?? '');

        this.onFailure({
            source: 'shell',
            label,
            output,
            timestamp: Date.now()
        });
    }
}
