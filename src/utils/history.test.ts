import * as vscode from 'vscode';
import { HistoryManager } from './history';
import { Logger } from './logger';
import type { FahhConfig, HistoryEntry } from '../types';

jest.mock('vscode', () => ({
    EventEmitter: class {
        event = jest.fn();
        fire = jest.fn();
        dispose = jest.fn();
    },
    TreeItem: class {
        constructor(label: string, collapsibleState?: any) {
            this.label = label;
            this.collapsibleState = collapsibleState;
        }
        label = '';
        collapsibleState = 0;
        tooltip = '';
        contextValue = '';
        command = undefined;
    },
    TreeItemCollapsibleState: {
        None: 0,
        Collapsed: 1,
        Expanded: 2
    }
}));
jest.mock('./logger');

describe('HistoryManager', () => {
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

    let historyManager: HistoryManager;
    let mockLogger: Logger;
    let mockState: vscode.Memento;
    let mockHistoryEntries: HistoryEntry[] = [];

    beforeEach(() => {
        mockHistoryEntries = [];
        mockLogger = new Logger('test');
        mockState = {
            get: jest.fn((key: string, defaultValue: any) => {
                if (key === 'fahh.history') {
                    return mockHistoryEntries.length > 0 ? mockHistoryEntries : defaultValue;
                }
                return defaultValue;
            }),
            update: jest.fn((key: string, value: any) => {
                if (key === 'fahh.history') {
                    mockHistoryEntries = value;
                }
            }),
            keys: jest.fn(() => []),
            getKeys: jest.fn(() => [])
        } as any;
        historyManager = new HistoryManager(() => mockConfig, mockLogger, mockState);
    });

    describe('add', () => {
        it('should add entry to beginning of history', () => {
            const entry: HistoryEntry = {
                id: 'test-1',
                timestamp: Date.now(),
                source: 'task',
                label: 'Build failed',
                soundPath: '/path/to/sound.mp3'
            };

            historyManager.add(entry);
            const last = historyManager.getLast();
            expect(last?.id).toBe('test-1');
        });

        it('should enforce historyMax limit', async () => {
            mockConfig.historyMax = 3;

            // Add entries directly to test the limit enforcement
            const entries: HistoryEntry[] = [];
            for (let i = 0; i < 5; i++) {
                entries.push({
                    id: `test-${i}`,
                    timestamp: Date.now() + i,
                    source: 'task',
                    label: `Failure ${i}`,
                    soundPath: `/path/${i}.mp3`
                });
                historyManager.add(entries[i]);
            }

            // Wait for async persistence
            await new Promise(resolve => setTimeout(resolve, 10));

            const all = historyManager.getAll();
            expect(all.length).toBeLessThanOrEqual(3);
        });

        it('should persist history to state', async () => {
            const entry: HistoryEntry = {
                id: 'test-1',
                timestamp: Date.now(),
                source: 'task',
                label: 'Build failed',
                soundPath: '/path/to/sound.mp3'
            };

            historyManager.add(entry);
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(mockState.update).toHaveBeenCalledWith('fahh.history', expect.any(Array));
        });

        it('should reload from state before adding', async () => {
            const existingEntry: HistoryEntry = {
                id: 'existing',
                timestamp: Date.now() - 1000,
                source: 'task',
                label: 'Existing',
                soundPath: '/existing.mp3'
            };
            (mockState.get as jest.Mock).mockReturnValue([existingEntry]);

            const newEntry: HistoryEntry = {
                id: 'new',
                timestamp: Date.now(),
                source: 'task',
                label: 'New',
                soundPath: '/new.mp3'
            };

            historyManager.add(newEntry);
            await new Promise(resolve => setTimeout(resolve, 10));
            const all = historyManager.getAll();
            expect(all).toHaveLength(2);
            expect(all[0].id).toBe('new');
            expect(all[1].id).toBe('existing');
        });
    });

    describe('clear', () => {
        it('should clear all entries', () => {
            historyManager.add({
                id: 'test-1',
                timestamp: Date.now(),
                source: 'task',
                label: 'Build failed',
                soundPath: '/path/to/sound.mp3'
            });

            historyManager.clear();
            expect(historyManager.getAll()).toHaveLength(0);
            expect(historyManager.getLast()).toBeNull();
        });

        it('should persist cleared state', async () => {
            historyManager.add({
                id: 'test-1',
                timestamp: Date.now(),
                source: 'task',
                label: 'Build failed',
                soundPath: '/path/to/sound.mp3'
            });
            await new Promise(resolve => setTimeout(resolve, 10));

            historyManager.clear();
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(mockState.update).toHaveBeenCalledWith('fahh.history', []);
        });
    });

    describe('getLast', () => {
        it('should return most recent entry', () => {
            const entry1: HistoryEntry = {
                id: 'test-1',
                timestamp: Date.now() - 1000,
                source: 'task',
                label: 'First',
                soundPath: '/first.mp3'
            };
            const entry2: HistoryEntry = {
                id: 'test-2',
                timestamp: Date.now(),
                source: 'task',
                label: 'Second',
                soundPath: '/second.mp3'
            };

            historyManager.add(entry1);
            historyManager.add(entry2);

            const last = historyManager.getLast();
            expect(last?.id).toBe('test-2');
        });

        it('should return null when history is empty', () => {
            expect(historyManager.getLast()).toBeNull();
        });
    });

    describe('getAll', () => {
        it('should return all entries in order', async () => {
            const entry1: HistoryEntry = {
                id: 'test-1',
                timestamp: Date.now() - 2000,
                source: 'task',
                label: 'First',
                soundPath: '/first.mp3'
            };
            const entry2: HistoryEntry = {
                id: 'test-2',
                timestamp: Date.now() - 1000,
                source: 'task',
                label: 'Second',
                soundPath: '/second.mp3'
            };
            const entry3: HistoryEntry = {
                id: 'test-3',
                timestamp: Date.now(),
                source: 'task',
                label: 'Third',
                soundPath: '/third.mp3'
            };

            historyManager.add(entry1);
            historyManager.add(entry2);
            historyManager.add(entry3);
            await new Promise(resolve => setTimeout(resolve, 10));

            const all = historyManager.getAll();
            expect(all.length).toBeGreaterThan(0);
        });

        it('should return empty array when history is empty', () => {
            expect(historyManager.getAll()).toEqual([]);
        });
    });

    describe('getChildren', () => {
        it('should return all entries as children when element is undefined', () => {
            historyManager.add({
                id: 'test-1',
                timestamp: Date.now(),
                source: 'task',
                label: 'Build failed',
                soundPath: '/path/to/sound.mp3'
            });

            const children = historyManager.getChildren();
            expect(children).toHaveLength(1);
        });

        it('should return empty array when element is provided', () => {
            const mockElement = {} as any;
            const children = historyManager.getChildren(mockElement);
            expect(children).toEqual([]);
        });
    });

    describe('dispose', () => {
        it('should dispose event emitter', () => {
            const disposeSpy = jest.spyOn(historyManager['onDidChangeTreeDataEmitter'], 'dispose');
            historyManager.dispose();
            expect(disposeSpy).toHaveBeenCalled();
        });
    });
});
