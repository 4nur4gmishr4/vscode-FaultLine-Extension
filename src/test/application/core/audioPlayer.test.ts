import { AudioPlayer } from '../../../application/core/audioPlayer';
import { Logger } from '../../../shared/utils/logger';

describe('AudioPlayer VBScript Path Escaper', () => {
    let player: AudioPlayer;

    beforeEach(() => {
        player = new AudioPlayer(new Logger('test'));
    });

    it('escapes VBScript string properly', () => {
        const escaped = (player as unknown as { escapeForVbsString: (s: string) => string })
            .escapeForVbsString('C:\\test"file.mp3');
        expect(escaped).toBe('C:\\test""file.mp3');
    });
});
