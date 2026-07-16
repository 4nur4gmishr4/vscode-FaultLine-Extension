import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FaultLineRuntime } from '../../application/runtime/faultline';
import { t } from '../../shared/utils/i18n';
import { registerSafeCommand, runCommand } from '../../shared/utils/commandGuard';

export function registerSoundCommands(ext: FaultLineRuntime, disposables: vscode.Disposable[]): void {
    registerSafeCommand(disposables, 'faultline.testSound', (...args: unknown[]) =>
        runCommand('testSound', async () => {
            const soundFile = typeof args[0] === 'string' ? args[0] : '';
            const volume = args[1] as number | string | undefined;
            const absolutePath = resolvePackSoundPath(ext.extensionPath, soundFile);
            if (!absolutePath) {
                void vscode.window.showErrorMessage(t('invalidSoundFile'));
                return;
            }
            const vol = volume ? Number(volume) : ext.configManager.readConfig().audio.volume;
            await ext.player.play(absolutePath, { volume: vol });
        })
    );

    registerSafeCommand(disposables, 'faultline.test', () =>
        runCommand('test', async () => {
            const soundPath = await ext.resolver.resolveForFailure('task', false);
            if (!soundPath) {
                void vscode.window.showErrorMessage(t('noSoundResolved'));
                return;
            }
            await ext.player.play(soundPath, {
                volume: ext.configManager.readConfig().audio.volume
            });
            void vscode.window.showInformationMessage(t('soundPlayed', { path: soundPath }));
        })
    );

    registerSafeCommand(disposables, 'faultline.testSuccess', () =>
        runCommand('testSuccess', async () => {
            const soundPath = await ext.resolver.resolveForFailure('task', true);
            if (!soundPath) {
                void vscode.window.showErrorMessage(t('noSuccessSoundResolved'));
                return;
            }
            await ext.player.play(soundPath, {
                volume: ext.configManager.readConfig().audio.volume
            });
            void vscode.window.showInformationMessage(t('successPlayed', { path: soundPath }));
        })
    );

    registerSafeCommand(disposables, 'faultline.selectSound', () =>
        runCommand('selectSound', async () => {
            const picked = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                openLabel: 'Use this sound',
                filters: { Audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a'] }
            });
            if (!picked || picked.length === 0) {
                return;
            }
            await ext.configManager.updateSoundPath(picked[0].fsPath);
            void vscode.window.showInformationMessage(t('soundUpdated'));
        })
    );

    registerSafeCommand(disposables, 'faultline.selectSoundFolder', () =>
        runCommand('selectSoundFolder', async () => {
            const picked = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select folder'
            });
            if (!picked || picked.length === 0) {
                return;
            }
            await ext.configManager.updateSoundFolder(picked[0].fsPath);
            void vscode.window.showInformationMessage(t('soundFolderSet'));
        })
    );

    registerSafeCommand(disposables, 'faultline.resetSound', () =>
        runCommand('resetSound', async () => {
            await ext.configManager.updateSoundPath('');
            void vscode.window.showInformationMessage(t('soundReset'));
        })
    );

    registerSafeCommand(disposables, 'faultline.pickSoundPack', () =>
        runCommand('pickSoundPack', async () => {
            const packs = await ext.resolver.listSoundPacks();
            if (packs.length === 0) {
                void vscode.window.showWarningMessage(t('noSoundPacks'));
                return;
            }
            const items = packs.map((p) => ({ label: p.name, description: p.id }));
            const picked = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a sound pack'
            });
            if (!picked?.description) {
                return;
            }
            const packPath = await ext.resolver.pickFromPack(picked.description);
            if (packPath) {
                await ext.configManager.updateSoundPath(packPath);
                void vscode.window.showInformationMessage(
                    t('soundPackSelected', { name: picked.label })
                );
            }
        })
    );

    registerSafeCommand(disposables, 'faultline.stop', () =>
        runCommand('stop', () => {
            ext.player.stop();
        })
    );
}

/** Allowed audio extensions for pack test playback. */
const PACK_AUDIO_EXT = /\.(mp3|wav|ogg|flac|m4a|aac)$/i;

/**
 * Resolve a sound for faultline.testSound to a file under resources/packs only.
 * Rejects path separators, absolute paths, and `..` (no arbitrary filesystem play).
 */
export function resolvePackSoundPath(extensionPath: string, soundFile: string): string | null {
    if (!soundFile || typeof soundFile !== 'string') {
        return null;
    }
    if (path.isAbsolute(soundFile) || /[/\\]/.test(soundFile) || soundFile.includes('..')) {
        return null;
    }
    const baseName = path.basename(soundFile);
    if (baseName !== soundFile || !PACK_AUDIO_EXT.test(baseName)) {
        return null;
    }

    const packsRoot = path.resolve(extensionPath, 'resources', 'packs');
    const candidates = [
        path.resolve(packsRoot, 'default', baseName),
        path.resolve(packsRoot, 'success', baseName)
    ];

    for (const candidate of candidates) {
        const rel = path.relative(packsRoot, candidate);
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
            continue;
        }
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}
