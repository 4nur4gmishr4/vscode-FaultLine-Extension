import * as vscode from 'vscode';

/**
 * State keys used by the extension.
 * History is owned by HistoryManager (`faultline.history`) — not StateStore.
 */
export const STATE_KEYS = {
    DAILY_FAIL_COUNT: 'faultline.dailyFailCount',
    DAILY_FAIL_DATE: 'faultline.dailyFailDate',
    LAST_VERSION: 'lastVersion',
    API_KEY_MIGRATION_COMPLETED: 'apiKeyMigrationCompleted'
} as const;

/** Local calendar day (YYYY-MM-DD) used to roll the daily failure counter over at midnight. */
function today(): string {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Manages persistent state for the extension (daily counter, version, migrations).
 */
export class StateStore {
    constructor(private readonly globalState: vscode.Memento) {}

    /** Current failure count for today; returns 0 if the stored count is from a previous day. */
    public getDailyFailCount(): number {
        const storedDate = this.globalState.get<string>(STATE_KEYS.DAILY_FAIL_DATE);
        if (storedDate !== today()) {
            return 0;
        }
        return this.globalState.get<number>(STATE_KEYS.DAILY_FAIL_COUNT, 0);
    }

    /** Increment today's failure count (rolling over from any prior day) and return the new value. */
    public async incrementDailyFailCount(): Promise<number> {
        const next = this.getDailyFailCount() + 1;
        await this.globalState.update(STATE_KEYS.DAILY_FAIL_DATE, today());
        await this.globalState.update(STATE_KEYS.DAILY_FAIL_COUNT, next);
        return next;
    }

    public async resetDailyFailCount(): Promise<void> {
        await this.globalState.update(STATE_KEYS.DAILY_FAIL_DATE, today());
        await this.globalState.update(STATE_KEYS.DAILY_FAIL_COUNT, 0);
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
     * Clear all state data owned by StateStore (not history — HistoryManager.clear()).
     */
    public async clear(): Promise<void> {
        const keys = Object.values(STATE_KEYS);
        for (const key of keys) {
            await this.globalState.update(key, undefined);
        }
    }
}
