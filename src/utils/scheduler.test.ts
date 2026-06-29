/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Scheduler } from './scheduler';
import type { FaultLineConfig, FailureSource } from '../types';

jest.mock('vscode', () => ({
    window: { state: { focused: false } }
}), { virtual: true });

import * as vscode from 'vscode';

function baseConfig(overrides: any = {}): FaultLineConfig {
    const config = {
        core: {
            enabled: true,
            logLevel: 'off' as const,
            historyMax: 50,
            snoozeMinutes: 10,
            language: 'en',
            dailySummary: false,
            streakCounter: false,
            bossFightMode: false
        },
        audio: {
            soundPack: '',
            soundPath: '',
            soundFolder: '',
            sounds: { task: '', shell: '', terminal: '', diagnostics: '', build: '', longTask: '' },
            successEnabled: false,
            successSound: '',
            volumes: { task: -1, shell: -1, terminal: -1, diagnostics: -1, build: -1, longTask: -1 },
            volume: 100,
            volumeCurve: 'linear' as const,
            soundMixingEnabled: false,
            soundFadeInDuration: 0,
            soundFadeOutDuration: 0,
            speakLabel: false,
            ttsVoice: ''
        },
        detection: {
            sources: new Set<FailureSource>(['task', 'shell', 'terminal']),
            cooldownMs: 0,
            cooldownPerSource: false,
            maxPerMinute: 0,
            ignorePatterns: [],
            diagnosticsThreshold: 1,
            longTaskThresholdMs: 60000,
            branchPatterns: [],
            quietHours: { enabled: false, from: '22:00', to: '08:00' },
            muteWhenFocused: false
        },
        webhook: {
            url: '',
            allowedDomains: [],
            format: 'default' as const,
            jiraUrl: '',
            jiraProject: '',
            jiraEmail: ''
        },
        ai: {
            summaryEnabled: false,
            provider: 'copilot',
            openrouterModel: '',
            errorExplanationEnabled: false,
            errorExplanationAutoShow: false
        },
        ui: {
            showNotification: false,
            notificationLevel: 'warning' as const,
            showStatusBar: true,
            statusBarCounter: false,
            flashStatusBar: false
        }
    };

    // Deep merge overrides for core and detection which are primarily tested here
    if (overrides.enabled !== undefined) config.core.enabled = overrides.enabled;
    if (overrides.muteWhenFocused !== undefined) config.detection.muteWhenFocused = overrides.muteWhenFocused;
    if (overrides.quietHours !== undefined) config.detection.quietHours = overrides.quietHours;
    if (overrides.maxPerMinute !== undefined) config.detection.maxPerMinute = overrides.maxPerMinute;
    if (overrides.cooldownMs !== undefined) config.detection.cooldownMs = overrides.cooldownMs;
    if (overrides.cooldownPerSource !== undefined) config.detection.cooldownPerSource = overrides.cooldownPerSource;

    return config as unknown as FaultLineConfig;
}

const stubLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    show: jest.fn(),
    setLevel: jest.fn(),
    dispose: jest.fn()
} as never;

describe('Scheduler', () => {
    afterEach(() => {
        jest.useRealTimers();
        (vscode.window.state as { focused: boolean }).focused = false;
    });

    describe('isMuted: hard kill switches', () => {
        it('mutes when the extension is disabled', () => {
            const scheduler = new Scheduler(() => baseConfig({ enabled: false }), stubLogger);
            expect(scheduler.isMuted('task')).toBe(true);
            scheduler.dispose();
        });

        it('mutes while snoozing and unmutes after the snooze ends', () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-05-12T10:00:00Z'));
            const scheduler = new Scheduler(() => baseConfig(), stubLogger);

            scheduler.snooze(5);
            expect(scheduler.isSnoozing()).toBe(true);
            expect(scheduler.isMuted('task')).toBe(true);

            jest.setSystemTime(new Date('2026-05-12T10:05:01Z'));
            expect(scheduler.isSnoozing()).toBe(false);
            expect(scheduler.isMuted('task')).toBe(false);
            scheduler.dispose();
        });

        it('clearSnooze immediately ends an active snooze', () => {
            const scheduler = new Scheduler(() => baseConfig(), stubLogger);
            scheduler.snooze(60);
            expect(scheduler.isSnoozing()).toBe(true);
            scheduler.clearSnooze();
            expect(scheduler.isSnoozing()).toBe(false);
            scheduler.dispose();
        });

        it('mutes when muteWhenFocused and the VS Code window is focused', () => {
            (vscode.window.state as { focused: boolean }).focused = true;
            const scheduler = new Scheduler(() => baseConfig({ muteWhenFocused: true }), stubLogger);
            expect(scheduler.isMuted('task')).toBe(true);
            scheduler.dispose();
        });
    });

    describe('isMuted: quiet hours', () => {
        function withClockAt(hour: number, minute: number) {
            jest.useFakeTimers().setSystemTime(new Date(2026, 4, 12, hour, minute, 0));
        }

        it('matches a same-day window: active inside, inactive outside', () => {
            const scheduler = new Scheduler(
                () => baseConfig({ quietHours: { enabled: true, from: '09:00', to: '17:00' } }),
                stubLogger
            );

            withClockAt(10, 0);
            expect(scheduler.isMuted('task')).toBe(true);

            withClockAt(8, 0);
            expect(scheduler.isMuted('task')).toBe(false);

            // End time is exclusive
            withClockAt(17, 0);
            expect(scheduler.isMuted('task')).toBe(false);
            scheduler.dispose();
        });

        it('matches a window crossing midnight (22:00 -> 08:00)', () => {
            const scheduler = new Scheduler(
                () => baseConfig({ quietHours: { enabled: true, from: '22:00', to: '08:00' } }),
                stubLogger
            );

            withClockAt(23, 0);
            expect(scheduler.isMuted('task')).toBe(true);

            withClockAt(2, 0);
            expect(scheduler.isMuted('task')).toBe(true);

            withClockAt(7, 59);
            expect(scheduler.isMuted('task')).toBe(true);

            withClockAt(9, 0);
            expect(scheduler.isMuted('task')).toBe(false);
            scheduler.dispose();
        });

        it('treats from === to as an empty window', () => {
            const scheduler = new Scheduler(
                () => baseConfig({ quietHours: { enabled: true, from: '12:00', to: '12:00' } }),
                stubLogger
            );

            withClockAt(12, 0);
            expect(scheduler.isMuted('task')).toBe(false);
            scheduler.dispose();
        });

        it('does nothing when quietHours.enabled is false', () => {
            const scheduler = new Scheduler(
                () => baseConfig({ quietHours: { enabled: false, from: '00:00', to: '23:59' } }),
                stubLogger
            );

            withClockAt(10, 0);
            expect(scheduler.isMuted('task')).toBe(false);
            scheduler.dispose();
        });
    });

    describe('isMuted: rate limits', () => {
        it('mutes after maxPerMinute records have been seen in the last minute', () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-05-12T10:00:00Z'));
            const scheduler = new Scheduler(() => baseConfig({ maxPerMinute: 2 }), stubLogger);

            expect(scheduler.isMuted('task')).toBe(false);
            scheduler.record('task');
            expect(scheduler.isMuted('task')).toBe(false);
            scheduler.record('task');
            expect(scheduler.isMuted('task')).toBe(true);

            // After the 1-minute window expires, it should unmute
            jest.setSystemTime(new Date('2026-05-12T10:01:01Z'));
            expect(scheduler.isMuted('task')).toBe(false);
            scheduler.dispose();
        });

        it('cooldownMs blocks the same source until elapsed (per-source mode)', () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-05-12T10:00:00Z'));
            const scheduler = new Scheduler(
                () => baseConfig({ cooldownMs: 1000, cooldownPerSource: true }),
                stubLogger
            );

            scheduler.record('task');
            expect(scheduler.isMuted('task')).toBe(true);
            // A different source is unaffected with per-source cooldown
            expect(scheduler.isMuted('shell')).toBe(false);

            jest.setSystemTime(new Date('2026-05-12T10:00:01.001Z'));
            expect(scheduler.isMuted('task')).toBe(false);
            scheduler.dispose();
        });

        it('global cooldown blocks all sources after any record', () => {
            jest.useFakeTimers().setSystemTime(new Date('2026-05-12T10:00:00Z'));
            const scheduler = new Scheduler(
                () => baseConfig({ cooldownMs: 1000, cooldownPerSource: false }),
                stubLogger
            );

            scheduler.record('task');
            expect(scheduler.isMuted('shell')).toBe(true);

            jest.setSystemTime(new Date('2026-05-12T10:00:01.500Z'));
            expect(scheduler.isMuted('shell')).toBe(false);
            scheduler.dispose();
        });
    });

    it('dispose clears the cleanup interval safely (idempotent)', () => {
        const scheduler = new Scheduler(() => baseConfig(), stubLogger);
        expect(() => {
            scheduler.dispose();
            scheduler.dispose();
        }).not.toThrow();
    });
});
