import * as vscode from 'vscode';
import { FahhConfig, FailureSource } from './config';
import { Logger } from './logger';

export type FailureHandler = (event: { source: FailureSource; label: string }) => void;
export type SuccessHandler = (event: { source: FailureSource; label: string }) => void;

interface TaskStartInfo {
    taskName: string;
    isBuild: boolean;
    startTime: number;
}

const taskStarts = new Map<string, TaskStartInfo>();
const TASK_START_TTL_MS = 1000 * 60 * 60; // 1 hour TTL for task starts to prevent memory leaks

export function registerFailureDetectors(
    config: () => FahhConfig,
    onFailure: FailureHandler,
    onSuccess: SuccessHandler | null,
    logger: Logger
): vscode.Disposable {
    const disposables: vscode.Disposable[] = [];

    // Periodic cleanup of taskStarts to prevent memory leaks
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [id, info] of taskStarts.entries()) {
            if (now - info.startTime > TASK_START_TTL_MS) {
                taskStarts.delete(id);
            }
        }
    }, 1000 * 60 * 15); // Every 15 minutes
    disposables.push({ dispose: () => clearInterval(cleanupInterval) });

    registerTaskDetector(config, onFailure, onSuccess, disposables);
    registerTerminalDetector(config, onFailure, onSuccess, logger, disposables);
    registerDiagnosticsDetector(config, onFailure, disposables);

    return vscode.Disposable.from(...disposables);
}

function taskIdentity(task: vscode.Task): string {
    return `${task.definition.type}|${task.name}|${task.source}`;
}

function registerTaskDetector(
    config: () => FahhConfig,
    onFailure: FailureHandler,
    onSuccess: SuccessHandler | null,
    disposables: vscode.Disposable[]
) {
    // Task process end (handles task, build, longTask)
    disposables.push(
        vscode.tasks.onDidEndTaskProcess((e) => {
            const cfg = config();
            const taskId = taskIdentity(e.execution.task);
            const startInfo = taskStarts.get(taskId);
            taskStarts.delete(taskId);

            const code = e.exitCode;
            const isSuccess = code === 0;
            const group = e.execution.task.group;
            const isBuild = isBuildGroup(group);
            const duration = startInfo ? Date.now() - startInfo.startTime : 0;
            const taskName = e.execution.task.name ?? 'unknown';

            if (isSuccess) {
                if (!onSuccess) { return; }
                if (cfg.sources.has('task')) {
                    onSuccess({ source: 'task', label: `Task "${taskName}" succeeded` });
                }
                if (isBuild && cfg.sources.has('build')) {
                    onSuccess({ source: 'build', label: `Build "${taskName}" succeeded` });
                }
                if (cfg.sources.has('longTask') && duration >= cfg.longTaskThresholdMs) {
                    onSuccess({ source: 'longTask', label: `Long task "${taskName}" completed (${Math.round(duration / 1000)}s)` });
                }
                return;
            }

            const codeText = code === undefined ? 'signal' : String(code);

            if (cfg.sources.has('task')) {
                onFailure({ source: 'task', label: `Task "${taskName}" failed (exit ${codeText})` });
            }
            if (isBuild && cfg.sources.has('build')) {
                onFailure({ source: 'build', label: `Build "${taskName}" failed (exit ${codeText})` });
            }
            if (cfg.sources.has('longTask') && duration >= cfg.longTaskThresholdMs) {
                onFailure({ source: 'longTask', label: `Long task "${taskName}" failed after ${Math.round(duration / 1000)}s` });
            }
        })
    );

    // Track task starts for duration
    disposables.push(
        vscode.tasks.onDidStartTask((e) => {
            const taskId = taskIdentity(e.execution.task);
            taskStarts.set(taskId, {
                taskName: e.execution.task.name,
                isBuild: isBuildGroup(e.execution.task.group),
                startTime: Date.now()
            });
        })
    );
}

function isBuildGroup(group: vscode.TaskGroup | undefined): boolean {
    if (!group) { return false; }
    // Prefer string id (stable across instances) when available; fall back to reference equality.
    const id = (group as unknown as { id?: string }).id;
    if (typeof id === 'string') { return id === 'build'; }
    return group === vscode.TaskGroup.Build;
}

function registerTerminalDetector(
    config: () => FahhConfig,
    onFailure: FailureHandler,
    onSuccess: SuccessHandler | null,
    logger: Logger,
    disposables: vscode.Disposable[]
) {
    // Terminal shell execution
    if (typeof vscode.window.onDidEndTerminalShellExecution === 'function') {
        disposables.push(
            vscode.window.onDidEndTerminalShellExecution((e) => {
                const cfg = config();
                const code = e.exitCode;
                const isSuccess = code === 0;

                if (isSuccess && onSuccess && cfg.sources.has('shell')) {
                    const cmd = e.execution?.commandLine?.value ?? 'command';
                    onSuccess({ source: 'shell', label: `Shell command succeeded: ${cmd.slice(0, 80)}` });
                    return;
                }

                if (!cfg.sources.has('shell')) { return; }
                if (code === undefined || code === 0) { return; }
                const cmd = e.execution?.commandLine?.value ?? 'command';
                const trimmed = cmd.length > 80 ? `${cmd.slice(0, 77)}...` : cmd;
                onFailure({ source: 'shell', label: `Shell command failed (exit ${code}): ${trimmed}` });
            })
        );
    } else {
        logger.warn('onDidEndTerminalShellExecution not available; "shell" source disabled.');
    }

    // Terminal close
    disposables.push(
        vscode.window.onDidCloseTerminal((t) => {
            const cfg = config();
            if (!cfg.sources.has('terminal')) { return; }
            const status = t.exitStatus;
            if (!status) { return; }
            const code = status.code;
            if (code === undefined || code === 0) { return; }
            onFailure({ source: 'terminal', label: `Terminal "${t.name}" exited (code ${code})` });
        })
    );
}

function registerDiagnosticsDetector(
    config: () => FahhConfig,
    onFailure: FailureHandler,
    disposables: vscode.Disposable[]
) {
    // Diagnostics listener
    const lastDiagnosticCounts = new Map<string, number>();
    let diagTimeout: NodeJS.Timeout | null = null;
    
    disposables.push(
        vscode.languages.onDidChangeDiagnostics((e) => {
            if (diagTimeout) { clearTimeout(diagTimeout); }
            diagTimeout = setTimeout(() => {
                const cfg = config();
                if (!cfg.sources.has('diagnostics')) { return; }

                let totalNewErrors = 0;
                // Only check the URIs that actually changed
                for (const uri of e.uris) {
                    const uriString = uri.toString();
                    const diags = vscode.languages.getDiagnostics(uri);
                    const errorCount = diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
                    const previousCount = lastDiagnosticCounts.get(uriString) ?? 0;

                    if (errorCount > previousCount) {
                        totalNewErrors += (errorCount - previousCount);
                    }
                    lastDiagnosticCounts.set(uriString, errorCount);
                }

                if (totalNewErrors >= cfg.diagnosticsThreshold) {
                    onFailure({ source: 'diagnostics', label: `${totalNewErrors} new error(s) detected in changed files` });
                }
            }, 500); // Debounce 500ms
        })
    );
    disposables.push({ dispose: () => { if (diagTimeout) { clearTimeout(diagTimeout); } } });

    // Clean up memory when text documents are closed
    disposables.push(
        vscode.workspace.onDidCloseTextDocument((doc) => {
            lastDiagnosticCounts.delete(doc.uri.toString());
        })
    );
}

