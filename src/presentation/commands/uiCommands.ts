import * as vscode from 'vscode';
import { FaultLineRuntime } from '../../application/runtime/faultline';
import { WelcomePanel } from '../ui/welcome';
import { SettingsPanel } from '../ui/settingsPanel';
import { FailureEvent } from '../../domain/types/index';
import { t } from '../../shared/utils/i18n';
import { runCommand } from '../../shared/utils/commandGuard';

export function registerUICommands(
    ext: FaultLineRuntime,
    extensionUri: vscode.Uri,
    disposables: vscode.Disposable[]
): void {
    disposables.push(
        vscode.commands.registerCommand('faultline.showOutput', () =>
            runCommand('showOutput', () => {
                ext.logger.show();
            })
        ),

        vscode.commands.registerCommand('faultline.showWelcome', () =>
            runCommand('showWelcome', () => {
                // Command palette: open welcome body (no intro typing every time)
                WelcomePanel.createOrShow(extensionUri, false);
            })
        ),

        vscode.commands.registerCommand('faultline.openSettings', (section?: string) =>
            runCommand('openSettings', () => {
                SettingsPanel.createOrShow(
                    extensionUri,
                    ext.configManager,
                    ext.secretManager,
                    ext.logger,
                    section
                );
            })
        ),

        vscode.commands.registerCommand('faultline.explainError', (failure?: FailureEvent) =>
            runCommand('explainError', () => {
                if (failure) {
                    ext.errorExplanation.showFailureExplanation(failure);
                    return;
                }
                const last = ext.history.getLast();
                if (last) {
                    ext.errorExplanation.showFailureExplanation(last);
                } else {
                    void vscode.window.showInformationMessage(t('noRecentErrors'));
                }
            })
        )
    );
}
