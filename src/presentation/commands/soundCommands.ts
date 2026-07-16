import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FaultLineRuntime } from '../../application/runtime/faultline';
import { t } from '../../shared/utils/i18n';

export function registerSoundCommands(ext: FaultLineRuntime, disposables: vscode.Disposable[]): void {
    disposables.push(
        vscode.commands.registerCommand('faultline.testSound', async (soundFile: string, volume?: number | string) => {
            try {
                const absolutePath = resolvePackSoundPath(ext.extensionPath, soundFile);
                if (!absolutePath) {
                    void vscode.window.showErrorMessage(t('invalidSoundFile'));
                    return;
                }
                const vol = volume ? Number(volume) : ext.configManager.readConfig().audio.volume;
                await ext.player.play(absolutePath, { volume: vol });
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                void vscode.window.showErrorMessage(t('playbackFailedShort', { message: msg }));
            }
        }),

        vscode.commands.registerCommand('faultline.test', async () => {
            const soundPath = await ext.resolver.resolveForFailure('task', false);
            if (!soundPath) {
                void vscode.window.showErrorMessage(t('noSoundResolved'));
                return;
            }
            try {
                await ext.player.play(soundPath, { volume: ext.configManager.readConfig().audio.volume });
                void vscode.window.showInformationMessage(t('soundPlayed', { path: soundPath }));
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                void vscode.window.showErrorMessage(t('playbackFailed', { message: msg }));
            }
        }),

        vscode.commands.registerCommand('faultline.testSuccess', async () => {
            const soundPath = await ext.resolver.resolveForFailure('task', true);
            if (!soundPath) {
                void vscode.window.showErrorMessage(t('noSuccessSoundResolved'));
                return;
            }
            try {
                await ext.player.play(soundPath, { volume: ext.configManager.readConfig().audio.volume });
                void vscode.window.showInformationMessage(t('successPlayed', { path: soundPath }));
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                void vscode.window.showErrorMessage(t('playbackFailed', { message: msg }));
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
            void vscode.window.showInformationMessage(t('soundUpdated'));
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
            void vscode.window.showInformationMessage(t('soundFolderSet'));
        }),

        vscode.commands.registerCommand('faultline.resetSound', async () => {
            await ext.configManager.updateSoundPath('');
            void vscode.window.showInformationMessage(t('soundReset'));
        }),

        vscode.commands.registerCommand('faultline.pickSoundPack', async () => {
            const packs = await ext.resolver.listSoundPacks();
            if (packs.length === 0) {
                void vscode.window.showWarningMessage(t('noSoundPacks'));
                return;
            }
            const items = packs.map((p) => ({ label: p.name, description: p.id }));
            const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Select a sound pack' });
            if (!picked?.description) { return; }
            const packPath = await ext.resolver.pickFromPack(picked.description);
            if (packPath) {
                await ext.configManager.updateSoundPath(packPath);
                void vscode.window.showInformationMessage(t('soundPackSelected', { name: picked.label }));
            }
        }),

        vscode.commands.registerCommand('faultline.stop', () => {
            ext.player.stop();
        })
    );
}

/** Allowed audio extensions for pack test playback. */
const PACK_AUDIO_EXT = /\.(mp3|wav|ogg|flac|m4a|aac)$/i;

/**
 * Resolve a sound for faultline.testSound to a file under resources/packs only.
 * Rejects path separators, absolute paths, and `..` (no arbitrary filesystem play).
 * Pure path helper (exported for unit tests); existence check uses the real FS.
 */
export function resolvePackSoundPath(extensionPath: string, soundFile: string): string | null {
    if (!soundFile || typeof soundFile !== 'string') {
        return null;
    }
    // Reject absolute paths and any directory component (incl. `..`).
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
