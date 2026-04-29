import * as vscode from 'vscode';
import { FahhConfig, FailureSource } from './config';
import { Logger } from './logger';

export type FailureHandler = (event: { source: FailureSource; label: string }) => void;

export function registerFailureDetectors(
    config: () => FahhConfig,
    onFailure: FailureHandler,
    logger: Logger
): vscode.Disposable {
    const disposables: vscode.Disposable[] = [];

    disposables.push(
        vscode.tasks.onDidEndTaskProcess((e) => {
            const cfg = config();
            if (!cfg.sources.has('task')) { return; }
            const code = e.exitCode;
            // exitCode === 0 -> success. Anything else (including undefined for signal-killed) is failure.
            if (code === 0) { return; }
            const taskName = e.execution?.task?.name ?? 'unknown';
            const codeText = code === undefined ? 'signal' : String(code);
            onFailure({ source: 'task', label: `Task "${taskName}" failed (exit ${codeText})` });
        })
    );

    if (typeof vscode.window.onDidEndTerminalShellExecution === 'function') {
        disposables.push(
            vscode.window.onDidEndTerminalShellExecution((e) => {
                const cfg = config();
                if (!cfg.sources.has('shell')) { return; }
                const code = e.exitCode;
                if (code === undefined || code === 0) { return; }
                const cmd = e.execution?.commandLine?.value ?? 'command';
                const trimmed = cmd.length > 80 ? `${cmd.slice(0, 77)}...` : cmd;
                onFailure({ source: 'shell', label: `Shell command failed (exit ${code}): ${trimmed}` });
            })
        );
    } else {
        logger.warn('onDidEndTerminalShellExecution not available in this VS Code version; "shell" source disabled.');
    }

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

    return vscode.Disposable.from(...disposables);
}
