import * as path from 'path';
import { SoundResolver } from '../../../application/core/soundResolver';
import { Logger } from '../../../shared/utils/logger';

const extensionPath = path.resolve(__dirname, '..', '..', '..', '..');

function audio(overrides: Record<string, unknown> = {}) {
    return {
        soundsEnabled: true,
        volume: 40,
        soundFolder: '',
        soundPath: '',
        soundPack: 'faultline.mp3',
        successEnabled: true,
        successSound: 'success_ding.mp3',
        ...overrides
    };
}

describe('SoundResolver path resolution', () => {
    const logger = new Logger('test');

    it('resolves default pack failure sound', async () => {
        const r = new SoundResolver(extensionPath, () => ({ audio: audio() }) as never, logger);
        const p = await r.resolveForFailure('task', false);
        expect(p).toBeTruthy();
        expect(p).toContain('faultline.mp3');
        expect(r.getVolume()).toBe(40);
    });

    it('resolves success sound from pack', async () => {
        const r = new SoundResolver(extensionPath, () => ({ audio: audio() }) as never, logger);
        const p = await r.resolveForFailure('task', true);
        expect(p).toBeTruthy();
        expect(String(p)).toMatch(/success_ding\.mp3$/);
    });

    it('lists built-in packs', async () => {
        const r = new SoundResolver(extensionPath, () => ({ audio: audio() }) as never, logger);
        const packs = await r.listSoundPacks();
        expect(packs.length).toBeGreaterThan(0);
        expect(packs.some((p) => p.id === 'default' || p.name.toLowerCase().includes('default'))).toBe(true);
    });

    it('uses absolute soundPath when present', async () => {
        const absolute = path.join(extensionPath, 'resources', 'packs', 'default', 'ohshit.mp3');
        const r = new SoundResolver(
            extensionPath,
            () => ({ audio: audio({ soundPath: absolute, soundPack: '' }) }) as never,
            logger
        );
        const p = await r.resolveForFailure('shell', false);
        expect(p).toBe(absolute);
    });

    it('returns null when success disabled path missing', async () => {
        const r = new SoundResolver(
            extensionPath,
            () =>
                ({
                    audio: audio({
                        successEnabled: true,
                        successSound: 'nope.mp3'
                    })
                }) as never,
            logger
        );
        // falls back to default success_ding
        const p = await r.resolveForFailure('task', true);
        expect(p).toMatch(/success_ding\.mp3$/);
    });
});
