import * as vscode from 'vscode';
import { FaultLineRuntime } from '../../application/runtime/faultline';
import { registerSoundCommands } from './soundCommands';
import { registerStateCommands } from './stateCommands';
import { registerUICommands } from './uiCommands';

/**
 * Registers all commands provided by the extension.
 * Each group is isolated so one registration failure cannot wipe the palette.
 */
export function registerCommands(
    ext: FaultLineRuntime,
    extensionUri: vscode.Uri,
    disposables: vscode.Disposable[]
): void {
    const groups: Array<{ name: string; run: () => void }> = [
        { name: 'sound', run: () => registerSoundCommands(ext, disposables) },
        { name: 'state', run: () => registerStateCommands(ext, disposables) },
        { name: 'ui', run: () => registerUICommands(ext, extensionUri, disposables) }
    ];

    for (const group of groups) {
        try {
            group.run();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            ext.logger.error(`Failed to register ${group.name} commands`, err);
            console.error(`[FaultLine] register ${group.name} commands failed:`, err);
            void vscode.window.showErrorMessage(
                `FaultLine: some ${group.name} commands failed to register (${msg}).`
            );
        }
    }
}
