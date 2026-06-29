/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as fs from 'fs';
import { isWSL, convertWSLPathToWindows } from '../core/wsl';

jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn()
    }
}));
jest.mock('child_process');

describe('WSL Utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Clear caches
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
        (require('../core/wsl') as any).cachedIsWSL = undefined;
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
        const wslPathCache = (require('../core/wsl') as any).wslPathCache;
        if (wslPathCache) {
            wslPathCache.clear();
        }
    });

    describe('isWSL', () => {
        it('should return false on non-linux platforms', async () => {
            Object.defineProperty(process, 'platform', { value: 'win32' });
            const result = await isWSL();
            expect(result).toBe(false);
        });

        it('should return false when osrelease file read fails', async () => {
            Object.defineProperty(process, 'platform', { value: 'linux' });
            (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('not found'));
            const result = await isWSL();
            expect(result).toBe(false);
        });
    });

    describe('convertWSLPathToWindows', () => {
        it('should convert /mnt/c paths to C:\\ format', async () => {
            const result = await convertWSLPathToWindows('/mnt/c/Users/test/file.txt');
            expect(result).toBe('C:\\Users\\test\\file.txt');
        });

        it('should convert /mnt/d paths to D:\\ format', async () => {
            const result = await convertWSLPathToWindows('/mnt/d/data/file.txt');
            expect(result).toBe('D:\\data\\file.txt');
        });

        it('should convert /mnt/c with lowercase drive to uppercase', async () => {
            const result = await convertWSLPathToWindows('/mnt/c/path');
            expect(result).toBe('C:\\path');
        });

        it('should convert /mnt/C with uppercase drive to uppercase', async () => {
            const result = await convertWSLPathToWindows('/mnt/C/path');
            expect(result).toBe('C:\\path');
        });

        it('should cache conversion results', async () => {
            const path = '/mnt/c/test.txt';
            const result1 = await convertWSLPathToWindows(path);
            const result2 = await convertWSLPathToWindows(path);

            expect(result1).toBe('C:\\test.txt');
            expect(result2).toBe('C:\\test.txt');
            // Second call should not trigger any file operations
            expect(fs.promises.readFile).not.toHaveBeenCalled();
        });

        it('should handle paths with special characters', async () => {
            const result = await convertWSLPathToWindows('/mnt/c/Users/test/file with spaces.txt');
            expect(result).toBe('C:\\Users\\test\\file with spaces.txt');
        });

        it('should handle root drive path', async () => {
            const result = await convertWSLPathToWindows('/mnt/c/');
            expect(result).toBe('C:\\');
        });
    });
});
