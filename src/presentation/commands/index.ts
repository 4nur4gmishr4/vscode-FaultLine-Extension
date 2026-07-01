import * as vscode from 'vscode';
import { FaultLineRuntime } from '../../application/runtime/faultline';
import { registerSoundCommands } from './soundCommands';
import { registerStateCommands } from './stateCommands';
import { registerUICommands } from './uiCommands';

/**
 * Registers all commands provided by the extension.
 */
export function registerCommands(ext: FaultLineRuntime, extensionUri: vscode.Uri, disposables: vscode.Disposable[]): void {
    registerSoundCommands(ext, disposables);
    registerStateCommands(ext, disposables);
    registerUICommands(ext, extensionUri, disposables);
}
