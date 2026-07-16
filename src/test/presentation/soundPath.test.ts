import * as path from 'path';
import { resolvePackSoundPath } from '../../presentation/commands/soundCommands';

const root = path.resolve(__dirname, '../../..');

describe('resolvePackSoundPath', () => {
    it('resolves a known pack basename under resources/packs', () => {
        const resolved = resolvePackSoundPath(root, 'faultline.mp3');
        expect(resolved).toBeTruthy();
        expect(resolved!.replace(/\\/g, '/')).toMatch(/resources\/packs\/default\/faultline\.mp3$/);
    });

    it('rejects path traversal and absolute paths', () => {
        expect(resolvePackSoundPath(root, '../secret.mp3')).toBeNull();
        expect(resolvePackSoundPath(root, 'default/faultline.mp3')).toBeNull();
        expect(resolvePackSoundPath(root, '/tmp/x.mp3')).toBeNull();
        expect(resolvePackSoundPath(root, 'C:\\x.mp3')).toBeNull();
    });

    it('rejects non-audio extensions and missing files', () => {
        expect(resolvePackSoundPath(root, 'readme.txt')).toBeNull();
        expect(resolvePackSoundPath(root, 'does-not-exist-xyz.mp3')).toBeNull();
        expect(resolvePackSoundPath(root, '')).toBeNull();
    });
});
