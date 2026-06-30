/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FaultLineRuntime } from '../../application/runtime/faultline';

export function registerSoundCommands(ext: FaultLineRuntime, disposables: vscode.Disposable[]): void {
    disposables.push(
        vscode.commands.registerCommand('faultline.testSound', async (soundFile, volume) => {
            try {

                let absolutePath = soundFile;
                if (!path.isAbsolute(soundFile)) {
                    absolutePath = path.join((ext as any).ctx.extensionPath, 'resources', 'packs', 'default', soundFile);
                    if (!fs.existsSync(absolutePath)) {
                        absolutePath = path.join((ext as any).ctx.extensionPath, 'resources', 'packs', 'success', soundFile);
                    }
                }
                const vol = volume ? Number(volume) : ext.configManager.readConfig().audio.volume;
                await ext.player.play(absolutePath, { volume: vol });
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                void vscode.window.showErrorMessage('FaultLine playback failed: ' + msg);
            }
        }),

        vscode.commands.registerCommand('faultline.test', async () => {
            const soundPath = await ext.resolver.resolveForFailure('task', false);
            if (!soundPath) {
                void vscode.window.showErrorMessage('FaultLine: no sound file resolved.');
                return;
            }
            try {
                await ext.player.play(soundPath, { volume: ext.configManager.readConfig().audio.volume });
                void vscode.window.showInformationMessage(`FaultLine played: ${soundPath}`);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                void vscode.window.showErrorMessage(`FaultLine playback failed: ${msg}. Open "FaultLine: Show Output Log" for details.`);
            }
        }),

        vscode.commands.registerCommand('faultline.testSuccess', async () => {
            const soundPath = await ext.resolver.resolveForFailure('task', true);
            if (!soundPath) {
                void vscode.window.showErrorMessage('FaultLine: no success sound resolved.');
                return;
            }
            try {
                await ext.player.play(soundPath, { volume: ext.configManager.readConfig().audio.volume });
                void vscode.window.showInformationMessage(`FaultLine success played: ${soundPath}`);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                void vscode.window.showErrorMessage(`FaultLine playback failed: ${msg}. Open "FaultLine: Show Output Log" for details.`);
            }
        }),

        vscode.commands.registerCommand('faultline.selectSound', async () => {
            const picked = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Use this sound',
                filters: { Audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a'] }
            });
            if (!picked || picked.length === 0) { return; }
            await ext.configManager.updateSoundPath(picked[0].fsPath);
            void vscode.window.showInformationMessage('FaultLine sound updated.');
        }),

        vscode.commands.registerCommand('faultline.selectSoundFolder', async () => {
            const picked = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select folder'
            });
            if (!picked || picked.length === 0) { return; }
            await ext.configManager.updateSoundFolder(picked[0].fsPath);
            void vscode.window.showInformationMessage('FaultLine sound folder set. Sounds will be random from this folder.');
        }),

        vscode.commands.registerCommand('faultline.resetSound', async () => {
            await ext.configManager.updateSoundPath('');
            void vscode.window.showInformationMessage('FaultLine sound reset to default.');
        }),

        vscode.commands.registerCommand('faultline.pickSoundPack', async () => {
            const packs = await ext.resolver.listSoundPacks();
            if (packs.length === 0) {
                void vscode.window.showWarningMessage('No sound packs installed. Use custom sound instead.');
                return;
            }
            const items = packs.map((p) => ({ label: p.name, description: p.id }));
            const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Select a sound pack' });
            if (!picked?.description) { return; }
            const packPath = await ext.resolver.pickFromPack(picked.description);
            if (packPath) {
                await ext.configManager.updateSoundPath(packPath);
                void vscode.window.showInformationMessage(`Sound pack "${picked.label}" selected.`);
            }
        }),

        vscode.commands.registerCommand('faultline.stop', () => {
            ext.player.stop();
        })
    );
}
