/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as vscode from 'vscode';
import { HistoryEntry } from '../../domain/types/index';

/**
 * State keys used by the extension.
 */
export const STATE_KEYS = {
    HISTORY: 'faultline.history',
    DAILY_FAIL_COUNT: 'faultline.dailyFailCount',
    LAST_VERSION: 'lastVersion',
    API_KEY_MIGRATION_COMPLETED: 'apiKeyMigrationCompleted'
} as const;

/**
 * Manages persistent state for the extension.
 */
export class StateStore {
    private historyCache: HistoryEntry[] | null = null;

    constructor(private readonly globalState: vscode.Memento) {}

    public getHistory(): HistoryEntry[] {
        if (!this.historyCache) {
            this.historyCache = this.globalState.get<HistoryEntry[]>(STATE_KEYS.HISTORY, []);
        }
        return this.historyCache;
    }

    public async updateHistory(history: HistoryEntry[], maxEntries: number = 100): Promise<void> {
        const trimmedHistory = history.length > maxEntries ? history.slice(0, maxEntries) : history;
        this.historyCache = trimmedHistory;
        await this.globalState.update(STATE_KEYS.HISTORY, trimmedHistory);
    }

    public getDailyFailCount(): number {
        return this.globalState.get<number>(STATE_KEYS.DAILY_FAIL_COUNT, 0);
    }

    public async updateDailyFailCount(count: number): Promise<void> {
        await this.globalState.update(STATE_KEYS.DAILY_FAIL_COUNT, count);
    }

    public getLastVersion(): string | undefined {
        return this.globalState.get<string>(STATE_KEYS.LAST_VERSION);
    }

    public async updateLastVersion(version: string): Promise<void> {
        await this.globalState.update(STATE_KEYS.LAST_VERSION, version);
    }

    public isMigrationCompleted(): boolean {
        return this.globalState.get<boolean>(STATE_KEYS.API_KEY_MIGRATION_COMPLETED, false);
    }

    public async setMigrationCompleted(completed: boolean): Promise<void> {
        await this.globalState.update(STATE_KEYS.API_KEY_MIGRATION_COMPLETED, completed);
    }

    /**
     * Clear all state data.
     */
    public async clear(): Promise<void> {
        const keys = Object.values(STATE_KEYS);
        for (const key of keys) {
            await this.globalState.update(key, undefined);
        }
    }
}
