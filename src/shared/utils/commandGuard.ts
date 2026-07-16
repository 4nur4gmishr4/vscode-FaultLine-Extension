import * as vscode from 'vscode';

/**
 * Run a command handler with a hard outer boundary.
 * Any throw becomes a user-visible error instead of a dead / crashed command.
 */
export async function runCommand(
    name: string,
    action: () => void | Promise<void>
): Promise<void> {
    try {
        await action();
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[FaultLine] command ${name} failed:`, err);
        void vscode.window.showErrorMessage(`FaultLine (${name}): ${msg}`);
    }
}

/**
 * Wrap a fire-and-forget async path so rejections never become unhandled.
 */
export function catchAsync(
    label: string,
    action: () => void | Promise<void>,
    onError?: (err: unknown) => void
): void {
    void (async () => {
        try {
            await action();
        } catch (err) {
            if (onError) {
                onError(err);
            } else {
                console.error(`[FaultLine] ${label}:`, err);
            }
        }
    })();
}
