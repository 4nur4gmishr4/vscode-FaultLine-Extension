/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
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
