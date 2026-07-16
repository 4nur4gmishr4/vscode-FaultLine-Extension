import { SoundResolver } from '../../../application/core/soundResolver';
import { Logger } from '../../../shared/utils/logger';

describe('SoundResolver', () => {
    let resolver: SoundResolver;
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = new Logger('test');
        resolver = new SoundResolver(
            '/test/path',
            () =>
                ({
                    audio: { soundsEnabled: true, volume: 50, soundFolder: '' }
                }) as ReturnType<ConstructorParameters<typeof SoundResolver>[1]>,
            mockLogger
        );
    });

    it('can instantiate', () => {
        expect(resolver).toBeDefined();
    });
});
