import * as path from 'path';
import * as os from 'os';
import { AudioPlayer } from '../../../application/core/audioPlayer';
import { Logger } from '../../../shared/utils/logger';

describe('AudioPlayer play guards', () => {
    let player: AudioPlayer;

    beforeEach(() => {
        player = new AudioPlayer(new Logger('test'));
    });

    afterEach(() => {
        player.dispose();
    });

    it('rejects empty path', async () => {
        await expect(player.play('', { volume: 50 })).rejects.toThrow(/No file path/);
    });

    it('rejects missing file', async () => {
        await expect(player.play(path.join(os.tmpdir(), 'no-such-faultline.mp3'), { volume: 50 })).rejects.toThrow(
            /not found/
        );
    });

    it('rejects after dispose', async () => {
        player.dispose();
        await expect(player.play(__filename, { volume: 10 })).rejects.toThrow(/disposed/);
    });

    it('stop is safe with no child', () => {
        expect(() => player.stop()).not.toThrow();
    });

    it('escapeForVbsString doubles quotes', () => {
        const escaped = (player as unknown as { escapeForVbsString: (s: string) => string }).escapeForVbsString(
            'a"b'
        );
        expect(escaped).toBe('a""b');
    });
});
