/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as vscode from 'vscode';
import { FaultLineRuntime } from '../../application/runtime/faultline';

export function registerStateCommands(ext: FaultLineRuntime, disposables: vscode.Disposable[]): void {
    disposables.push(
        vscode.commands.registerCommand('faultline.toggle', async () => {
            const next = !ext.configManager.readConfig().core.enabled;
            await ext.configManager.updateEnabled(next);
            void vscode.window.showInformationMessage(`FaultLine ${next ? 'enabled' : 'disabled'}.`);
            ext.statusBar.refresh();
        }),

        vscode.commands.registerCommand('faultline.toggleSounds', async () => {
            const next = !ext.configManager.readConfig().audio.soundsEnabled;
            await ext.configManager.updateSoundsEnabled(next);
            void vscode.window.showInformationMessage(`FaultLine sounds ${next ? 'ON' : 'OFF'}.`);
            ext.statusBar.refresh();
        }),

        vscode.commands.registerCommand('faultline.toggleWorkspace', async () => {
            const next = !ext.configManager.readConfig().core.enabled;
            await ext.configManager.updateEnabled(next, vscode.ConfigurationTarget.Workspace);
            void vscode.window.showInformationMessage(`FaultLine ${next ? 'enabled' : 'disabled'} for this workspace.`);
            ext.statusBar.refresh();
        }),

        vscode.commands.registerCommand('faultline.snooze', () => {
            const minutes = ext.configManager.readConfig().core.snoozeMinutes;
            ext.scheduler.snooze(minutes);
            void vscode.window.showInformationMessage(`FaultLine snoozed for ${minutes} minutes.`);
        }),

        vscode.commands.registerCommand('faultline.resetSettings', async () => {
            const confirm = await vscode.window.showWarningMessage(
                'Are you sure you want to reset all FaultLine settings to default?',
                { modal: true },
                'Reset'
            );
            if (confirm === 'Reset') {
                await ext.configManager.resetAllSettings();
                ext.statusBar.refresh();
                void vscode.window.showInformationMessage('FaultLine settings have been reset.');
            }
        }),

        vscode.commands.registerCommand('faultline.factoryReset', async () => {
            const confirm = await vscode.window.showWarningMessage(
                'This will reset all settings AND clear your failure history. Proceed?',
                { modal: true },
                'Factory Reset'
            );
            if (confirm === 'Factory Reset') {
                await ext.configManager.resetAllSettings();
                ext.history.clear();
                ext.statusBar.resetCounter();
                await ext.stateStore.updateLastVersion('');
                ext.statusBar.refresh();
                void vscode.window.showInformationMessage('FaultLine has been factory reset.');
            }
        })
    );
}
