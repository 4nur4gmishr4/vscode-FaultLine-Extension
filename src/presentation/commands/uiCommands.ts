import * as vscode from 'vscode';
import { FaultLineRuntime } from '../../application/runtime/faultline';
import { WelcomePanel } from '../ui/welcome';
import { SettingsPanel } from '../ui/settingsPanel';
import { FailureEvent } from '../../domain/types/index';
import { t } from '../../shared/utils/i18n';
import { registerSafeCommand, runCommand } from '../../shared/utils/commandGuard';

export function registerUICommands(
    ext: FaultLineRuntime,
    extensionUri: vscode.Uri,
    disposables: vscode.Disposable[]
): void {
    registerSafeCommand(disposables, 'faultline.showOutput', () =>
        runCommand('showOutput', () => {
            ext.logger.show();
        })
    );

    registerSafeCommand(disposables, 'faultline.showWelcome', () =>
        runCommand('showWelcome', () => {
            WelcomePanel.createOrShow(extensionUri, false);
        })
    );

    registerSafeCommand(disposables, 'faultline.openSettings', (...args: unknown[]) =>
        runCommand('openSettings', () => {
            const section = typeof args[0] === 'string' ? args[0] : undefined;
            SettingsPanel.createOrShow(
                extensionUri,
                ext.configManager,
                ext.secretManager,
                ext.logger,
                section
            );
        })
    );

    registerSafeCommand(disposables, 'faultline.explainError', (...args: unknown[]) =>
        runCommand('explainError', () => {
            const failure = args[0] as FailureEvent | undefined;
            if (failure && typeof failure === 'object' && 'label' in failure) {
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
    );
}
