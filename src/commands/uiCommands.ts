/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as vscode from 'vscode';
import { FaultLineRuntime } from '../runtime/faultline';
import { WelcomePanel } from '../ui/welcome';
import { SettingsPanel } from '../ui/settingsPanel';
import { FailureEvent } from '../types';

export function registerUICommands(ext: FaultLineRuntime, extensionUri: vscode.Uri, disposables: vscode.Disposable[]): void {
    disposables.push(
        vscode.commands.registerCommand('faultline.showOutput', () => {
            ext.logger.show();
        }),

        vscode.commands.registerCommand('faultline.showWelcome', () => {
            WelcomePanel.createOrShow(extensionUri);
        }),

        vscode.commands.registerCommand('faultline.openSettings', (section?: string) => {
            SettingsPanel.createOrShow(extensionUri, ext.configManager, ext.secretManager, ext.logger, section);
        }),

        vscode.commands.registerCommand('faultline.explainError', (failure?: FailureEvent) => {
            if (failure) {
                ext.errorExplanation.showFailureExplanation(failure);
            } else {
                const last = ext.history.getLast();
                if (last) {
                    ext.errorExplanation.showFailureExplanation(last);
                } else {
                    void vscode.window.showInformationMessage('FaultLine: No recent errors to explain.');
                }
            }
        })
    );
}
