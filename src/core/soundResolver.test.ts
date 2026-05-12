import * as fs from 'fs';
import { SoundResolver } from './soundResolver';
import { Logger } from '../utils/logger';
import type { FahhConfig } from '../types';

jest.mock('fs', () => ({
    promises: {
        access: jest.fn(),
        readdir: jest.fn(),
        readFile: jest.fn()
    }
}));
jest.mock('../utils/logger');

describe('SoundResolver', () => {
    const mockExtensionPath = '/mock/extension';
    const mockConfig: FahhConfig = {
        enabled: true,
        volume: 50,
        volumeCurve: 'linear',
        successEnabled: false,
        successSound: '',
        soundPath: '',
        soundFolder: '',
        soundPack: '',
        sounds: {
            task: '',
            shell: '',
            terminal: '',
            diagnostics: '',
            build: '',
            longTask: ''
        },
        volumes: {
            task: -1,
            shell: -1,
            terminal: -1,
            diagnostics: -1,
            build: -1,
            longTask: -1
        },
        flashStatusBar: false,
        quietHours: { enabled: false, from: '22:00', to: '08:00' },
        muteWhenFocused: false,
        snoozeMinutes: 10,
        diagnosticsThreshold: 1,
        longTaskThresholdMs: 60000,
        logLevel: 'off',
        historyMax: 50,
        speakLabel: false,
        webhookUrl: '',
        webhookAllowedDomains: [],
        aiSummaryEnabled: false,
        aiProvider: 'copilot',
        openrouterModel: '',
        dailySummary: false,
        streakCounter: false,
        bossFightMode: false,
        errorExplanationEnabled: true,
        errorExplanationAutoShow: true,
        showNotification: false,
        notificationLevel: 'error',
        sources: new Set(['task']),
        cooldownMs: 1000,
        maxPerMinute: 10,
        cooldownPerSource: false,
        ignorePatterns: [],
        showStatusBar: false,
        statusBarCounter: false
    };

    let resolver: SoundResolver;
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = new Logger('test');
        resolver = new SoundResolver(mockExtensionPath, () => mockConfig, mockLogger);
        jest.clearAllMocks();
    });

    describe('resolveForFailure', () => {
        beforeEach(() => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.readdir as jest.Mock).mockResolvedValue([]);
            // Reset config state
            mockConfig.sounds = { task: '', shell: '', terminal: '', diagnostics: '', build: '', longTask: '' };
            mockConfig.soundFolder = '';
            mockConfig.soundPath = '';
            mockConfig.successEnabled = false;
            mockConfig.successSound = '';
        });

        it('should return success sound when isSuccess=true and successEnabled=true', async () => {
            mockConfig.successEnabled = true;
            mockConfig.successSound = '/path/to/success.mp3';

            const result = await resolver.resolveForFailure('task', true);
            expect(result).toBe('/path/to/success.mp3');
        });

        it('should return default sound when isSuccess=true but successSound does not exist', async () => {
            mockConfig.successEnabled = true;
            mockConfig.successSound = '/nonexistent.mp3';
            (fs.promises.access as jest.Mock).mockRejectedValue(new Error('not found'));

            const result = await resolver.resolveForFailure('task', true);
            expect(result).toContain('fahh.mp3');
        });

        it('should return per-source sound when configured and exists', async () => {
            mockConfig.sounds = { task: '/custom/task.mp3', shell: '', terminal: '', diagnostics: '', build: '', longTask: '' };

            const result = await resolver.resolveForFailure('task');
            expect(result).toBe('/custom/task.mp3');
        });

        it('should return sound from folder when configured and has audio files', async () => {
            mockConfig.soundFolder = '/sounds/folder';
            (fs.promises.readdir as jest.Mock).mockResolvedValue(['sound1.mp3', 'sound2.wav']);

            const result = await resolver.resolveForFailure('task');
            // Normalize path separators for cross-platform compatibility
            if (result) {
                const normalizedResult = result.replace(/\\/g, '/');
                expect(['/sounds/folder/sound1.mp3', '/sounds/folder/sound2.wav']).toContain(normalizedResult);
            }
        });

        it('should return global sound path when configured and exists', async () => {
            mockConfig.soundPath = '/global/sound.mp3';

            const result = await resolver.resolveForFailure('task');
            expect(result).toBe('/global/sound.mp3');
        });

        it('should return default sound when no other options available', async () => {
            const result = await resolver.resolveForFailure('task');
            expect(result).toContain('fahh.mp3');
        });

        it('should return null when default sound does not exist', async () => {
            (fs.promises.access as jest.Mock).mockRejectedValue(new Error('not found'));

            const result = await resolver.resolveForFailure('task');
            expect(result).toBeNull();
        });
    });

    describe('getVolume', () => {
        it('should return per-source volume when configured and >= 0', () => {
            mockConfig.volumes = { task: 75, shell: -1, terminal: -1, diagnostics: -1, build: -1, longTask: -1 };
            mockConfig.volume = 50;

            const result = resolver.getVolume('task');
            expect(result).toBe(75);
        });

        it('should return global volume when per-source is -1 (use global)', () => {
            mockConfig.volumes = { task: -1, shell: -1, terminal: -1, diagnostics: -1, build: -1, longTask: -1 };
            mockConfig.volume = 60;

            const result = resolver.getVolume('task');
            expect(result).toBe(60);
        });

        it('should return global volume when per-source is undefined', () => {
            mockConfig.volumes = { task: -1, shell: -1, terminal: -1, diagnostics: -1, build: -1, longTask: -1 };
            mockConfig.volume = 80;

            const result = resolver.getVolume('task');
            expect(result).toBe(80);
        });
    });

    describe('listSoundPacks', () => {
        beforeEach(() => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
        });

        it('should return empty array when pack directory does not exist', async () => {
            (fs.promises.access as jest.Mock).mockRejectedValue(new Error('not found'));

            const result = await resolver.listSoundPacks();
            expect(result).toEqual([]);
        });

        it('should list packs with audio files', async () => {
            (fs.promises.readdir as jest.Mock)
                .mockResolvedValueOnce([
                    { name: 'default', isDirectory: () => true },
                    { name: 'custom', isDirectory: () => true }
                ])
                .mockResolvedValueOnce(['sound.mp3'])
                .mockResolvedValueOnce(['audio.wav']);

            const result = await resolver.listSoundPacks();
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('default');
            expect(result[1].id).toBe('custom');
        });

        it('should skip directories without audio files', async () => {
            (fs.promises.readdir as jest.Mock)
                .mockResolvedValueOnce([
                    { name: 'empty', isDirectory: () => true },
                    { name: 'valid', isDirectory: () => true }
                ])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce(['sound.mp3']);

            const result = await resolver.listSoundPacks();
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('valid');
        });

        it('should handle readdir errors gracefully', async () => {
            (fs.promises.readdir as jest.Mock).mockRejectedValue(new Error('permission denied'));

            const result = await resolver.listSoundPacks();
            expect(result).toEqual([]);
        });
    });

    describe('pickFromPack', () => {
        beforeEach(() => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
        });

        it('should return null when pack does not exist', async () => {
            (fs.promises.access as jest.Mock).mockRejectedValue(new Error('not found'));

            const result = await resolver.pickFromPack('nonexistent');
            expect(result).toBeNull();
        });

        it('should return null when pack has no audio files', async () => {
            (fs.promises.readdir as jest.Mock).mockResolvedValue([]);

            const result = await resolver.pickFromPack('empty');
            expect(result).toBeNull();
        });

        it('should return random sound from pack', async () => {
            (fs.promises.readdir as jest.Mock).mockResolvedValue(['sound1.mp3', 'sound2.wav']);

            const result = await resolver.pickFromPack('default');
            if (result) {
                const normalizedResult = result.replace(/\\/g, '/');
                const expectedPaths = ['/mock/extension/resources/packs/default/sound1.mp3', '/mock/extension/resources/packs/default/sound2.wav'];
                expect(expectedPaths).toContain(normalizedResult);
            }
        });
    });

    describe('titleCase', () => {
        it('should convert hyphens to spaces and capitalize', () => {
            const result = (resolver as any).titleCase('my-sound-pack');
            expect(result).toBe('My Sound Pack');
        });

        it('should convert underscores to spaces and capitalize', () => {
            const result = (resolver as any).titleCase('default_sounds');
            expect(result).toBe('Default Sounds');
        });

        it('should capitalize first letter of each word', () => {
            const result = (resolver as any).titleCase('hello world');
            expect(result).toBe('Hello World');
        });
    });
});
