import * as wsl from '../../../application/core/wsl';

describe('wsl helpers', () => {
    it('exports isWSL and convertWSLPathToWindows', () => {
        expect(typeof wsl.isWSL).toBe('function');
        expect(typeof wsl.convertWSLPathToWindows).toBe('function');
    });

    it('isWSL returns boolean', async () => {
        const result = await wsl.isWSL();
        expect(typeof result).toBe('boolean');
    });
});
