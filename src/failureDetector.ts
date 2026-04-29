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

    // Task process end (handles task, build, longTask)
    disposables.push(
        vscode.tasks.onDidEndTaskProcess((e) => {
            const cfg = config();
            const def = e.execution.task.definition;
            const taskId = `${def.type}:${JSON.stringify(def)}`;
            const startInfo = taskStarts.get(taskId);
            taskStarts.delete(taskId);

            const code = e.exitCode;
            const isSuccess = code === 0;
            const isBuild = e.execution.task.group === vscode.TaskGroup.Build;
            const duration = startInfo ? Date.now() - startInfo.startTime : 0;

            if (isSuccess) {
                if (onSuccess) {
                    onSuccess({ source: 'task', label: `Task "${e.execution.task.name}" succeeded` });
                    if (isBuild) {
                        onSuccess({ source: 'build', label: `Build "${e.execution.task.name}" succeeded` });
                    }
                    if (cfg.sources.has('longTask') && duration >= cfg.longTaskThresholdMs) {
                        onSuccess({ source: 'longTask', label: `Long task "${e.execution.task.name}" completed (${Math.round(duration / 1000)}s)` });
                    }
                }
                return;
            }

            // Failure
            if (!cfg.sources.has('task')) { return; }
            if (code === 0) { return; } // shouldn't happen given above
            const taskName = e.execution?.task?.name ?? 'unknown';
            const codeText = code === undefined ? 'signal' : String(code);
            onFailure({ source: 'task', label: `Task "${taskName}" failed (exit ${codeText})` });

            if (isBuild && cfg.sources.has('build')) {
                onFailure({ source: 'build', label: `Build "${taskName}" failed (exit ${codeText})` });
            }
        })
    );

    // Track task starts for duration
    disposables.push(
        vscode.tasks.onDidStartTask((e) => {
            const def = e.execution.task.definition;
            const taskId = `${def.type}:${JSON.stringify(def)}`;
            const isBuild = e.execution.task.group === vscode.TaskGroup.Build;
            taskStarts.set(taskId, {
                taskName: e.execution.task.name,
                isBuild,
                startTime: Date.now()
            });
        })
    );

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

    // Diagnostics listener
    let lastDiagnosticCount = 0;
    let diagTimeout: NodeJS.Timeout | null = null;
    disposables.push(
        vscode.languages.onDidChangeDiagnostics(() => {
            if (diagTimeout) { clearTimeout(diagTimeout); }
            diagTimeout = setTimeout(() => {
                const cfg = config();
                if (!cfg.sources.has('diagnostics')) { return; }
                const all = vscode.languages.getDiagnostics();
                const errorCount = all.reduce((sum, [, diags]) => sum + diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length, 0);
                if (errorCount > lastDiagnosticCount && errorCount >= cfg.diagnosticsThreshold) {
                    const newErrors = errorCount - lastDiagnosticCount;
                    onFailure({ source: 'diagnostics', label: `${newErrors} new error(s) detected` });
                }
                lastDiagnosticCount = errorCount;
            }, 500); // Debounce 500ms
        })
    );
    disposables.push({ dispose: () => { if (diagTimeout) { clearTimeout(diagTimeout); } } });

    // Debug session listener (if API available)
    if (vscode.debug) {
        disposables.push(
            vscode.debug.onDidTerminateDebugSession((session) => {
                const cfg = config();
                if (!cfg.sources.has('debug')) { return; }
                // Debug sessions don't have exit codes directly; infer from custom event if possible
                // For now, we rely on users requesting this feature and reporting the experience
            })
        );
    }

    // Test listener (if test API available in this VS Code version)
    try {
        const testApi = (vscode as any).tests;
        if (testApi?.onDidChangeTestResults) {
            disposables.push(
                testApi.onDidChangeTestResults((results: any) => {
                    const cfg = config();
                    if (!cfg.sources.has('test')) { return; }
                    // Check if any test failed
                    const failed = results?.items?.some((item: any) => item.result?.state === 'Failed');
                    if (failed) {
                        onFailure({ source: 'test', label: 'Tests failed' });
                    } else if (onSuccess && results?.items?.every((item: any) => item.result?.state === 'Passed')) {
                        onSuccess({ source: 'test', label: 'All tests passed' });
                    }
                })
            );
        }
    } catch {
        // Test API not available
    }

    return vscode.Disposable.from(...disposables);
}
