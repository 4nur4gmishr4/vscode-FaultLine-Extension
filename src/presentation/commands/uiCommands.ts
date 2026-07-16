import * as vscode from 'vscode';
import { FaultLineRuntime } from '../../application/runtime/faultline';
import { WelcomePanel } from '../ui/welcome';
import { SettingsPanel } from '../ui/settingsPanel';
import { FailureEvent } from '../../domain/types/index';
import { t } from '../../shared/utils/i18n';

export function registerUICommands(ext: FaultLineRuntime, extensionUri: vscode.Uri, disposables: vscode.Disposable[]): void {
    disposables.push(
        vscode.commands.registerCommand('faultline.showOutput', () => {
            ext.logger.show();
        }),

        vscode.commands.registerCommand('faultline.showWelcome', () => {
            // Command palette: open welcome body (no intro typing every time)
            WelcomePanel.createOrShow(extensionUri, false);
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
                    void vscode.window.showInformationMessage(t('noRecentErrors'));
                }
            }
        })
    );
}
