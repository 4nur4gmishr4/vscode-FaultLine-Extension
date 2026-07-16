import * as vscode from 'vscode';
import { FaultLineRuntime } from '../../application/runtime/faultline';
import { listProviders } from '../../infrastructure/services/aiProviders';
import { t } from '../../shared/utils/i18n';
import { registerSafeCommand, runCommand } from '../../shared/utils/commandGuard';

export function registerStateCommands(ext: FaultLineRuntime, disposables: vscode.Disposable[]): void {
    registerSafeCommand(disposables, 'faultline.toggle', () =>
        runCommand('toggle', async () => {
            const next = !ext.configManager.readConfig().core.enabled;
            await ext.configManager.updateEnabled(next);
            void vscode.window.showInformationMessage(next ? t('toggledOn') : t('toggledOff'));
            ext.statusBar.refresh();
        })
    );

    registerSafeCommand(disposables, 'faultline.toggleSounds', () =>
        runCommand('toggleSounds', async () => {
            const next = !ext.configManager.readConfig().audio.soundsEnabled;
            await ext.configManager.updateSoundsEnabled(next);
            void vscode.window.showInformationMessage(next ? t('soundsOn') : t('soundsOff'));
            ext.statusBar.refresh();
        })
    );

    registerSafeCommand(disposables, 'faultline.toggleWorkspace', () =>
        runCommand('toggleWorkspace', async () => {
            const next = !ext.configManager.readConfig().core.enabled;
            await ext.configManager.updateEnabled(next, vscode.ConfigurationTarget.Workspace);
            void vscode.window.showInformationMessage(
                next ? t('toggledOnWorkspace') : t('toggledOffWorkspace')
            );
            ext.statusBar.refresh();
        })
    );

    registerSafeCommand(disposables, 'faultline.snooze', () =>
        runCommand('snooze', () => {
            const minutes = ext.configManager.readConfig().core.snoozeMinutes;
            ext.scheduler.snooze(minutes);
            void vscode.window.showInformationMessage(t('snoozed', { minutes }));
        })
    );

    registerSafeCommand(disposables, 'faultline.resetSettings', () =>
        runCommand('resetSettings', async () => {
            const confirm = await vscode.window.showWarningMessage(
                t('resetSettingsConfirm'),
                { modal: true },
                'Reset'
            );
            if (confirm === 'Reset') {
                await ext.configManager.resetAllSettings();
                ext.statusBar.refresh();
                void vscode.window.showInformationMessage(t('settingsReset'));
            }
        })
    );

    registerSafeCommand(disposables, 'faultline.factoryReset', () =>
        runCommand('factoryReset', async () => {
            const confirm = await vscode.window.showWarningMessage(
                t('factoryResetConfirm'),
                { modal: true },
                'Factory Reset'
            );
            if (confirm === 'Factory Reset') {
                await ext.configManager.resetAllSettings();
                await clearStoredSecrets(ext);
                ext.history.clear();
                await ext.stateStore.clear();
                ext.scheduler.clearSnooze();
                ext.statusBar.resetCounter();
                ext.statusBar.refresh();
                void vscode.window.showInformationMessage(t('factoryResetDone'));
            }
        })
    );
}

/** Providers that may have keys in SecretStorage (AI registry + legacy integrations). */
const EXTRA_SECRET_PROVIDERS = [
    'jira',
    'teamsync',
    'github',
    'pagerduty',
    'sentry',
    'projectmanagement'
] as const;

async function clearStoredSecrets(ext: FaultLineRuntime): Promise<void> {
    const providers = new Set<string>([
        ...listProviders().map((p) => p.id),
        ...EXTRA_SECRET_PROVIDERS
    ]);
    for (const provider of providers) {
        try {
            await ext.secretManager.deleteApiKey(provider);
        } catch {
            // Best-effort: one missing secret must not abort factory reset.
        }
    }
}
