/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Logger } from '../utils/logger';
import { ConfigManager } from '../config/configManager';
import { StateStore } from '../state/stateStore';

/**
 * Service for gamification features like Boss HP and success streaks.
 */
export class GamificationService {
    private dailyTimer: NodeJS.Timeout | null = null;

    constructor(
        private readonly configManager: ConfigManager,
        private readonly stateStore: StateStore,
        private readonly logger: Logger
    ) {
        this.scheduleDailySummary();
    }

    public async recordFailure(): Promise<string | null> {
        try {
            const cfg = this.configManager.readConfig().core;
            
            const count = this.stateStore.getDailyFailCount() + 1;
            await this.stateStore.updateDailyFailCount(count);
            await this.stateStore.updateLastSuccessStreak(0);

            if (cfg.bossFightMode) {
                const bossHp = Math.max(0, this.stateStore.getBossHp() - 10);
                if (bossHp <= 0) {
                    await this.stateStore.updateBossHp(100);
                    return '💀 DEFEAT! Boss HP depleted. Resetting...';
                }
                await this.stateStore.updateBossHp(bossHp);
                return `⚔️ Boss HP: ${bossHp}%`;
            }
            return null;
        } catch (err) {
            this.logger.error('Failed to record failure', err);
            return null;
        }
    }

    public async recordSuccess(): Promise<string | null> {
        try {
            const cfg = this.configManager.readConfig().core;
            
            const streak = this.stateStore.getLastSuccessStreak() + 1;
            await this.stateStore.updateLastSuccessStreak(streak);

            let streakMsg: string | null = null;
            if (cfg.streakCounter) {
                if (streak >= 10 && streak % 10 === 0) {
                    streakMsg = `🔥 ${streak} successes in a row!`;
                }
            }

            if (cfg.bossFightMode) {
                const bossHp = this.stateStore.getBossHp();
                if (bossHp < 100) {
                    await this.stateStore.updateBossHp(Math.min(100, bossHp + 5));
                }
            }
            return streakMsg;
        } catch (err) {
            this.logger.error('Failed to record success', err);
            return null;
        }
    }

    public getDailySummary(): string {
        return `Today: ${this.stateStore.getDailyFailCount()} failures, ${this.stateStore.getLastSuccessStreak()} current success streak.`;
    }

    private scheduleDailySummary(): void {
        try {
            const cfg = this.configManager.readConfig().core;
            if (!cfg.dailySummary) {
                return;
            }
            if (this.dailyTimer) {
                clearTimeout(this.dailyTimer);
            }
            const now = new Date();
            const target = new Date(now);
            target.setHours(18, 0, 0, 0);
            if (target <= now) {
                target.setDate(target.getDate() + 1);
            }
            const ms = target.getTime() - now.getTime();
            this.dailyTimer = setTimeout(async () => {
                try {
                    this.logger.info(this.getDailySummary());
                    await this.stateStore.updateDailyFailCount(0);
                } catch (err) {
                    this.logger.warn(`Failed to reset daily fail count: ${err instanceof Error ? err.message : String(err)}`);
                }
                this.scheduleDailySummary();
            }, ms);
        } catch (err) {
            this.logger.error('Failed to schedule daily summary', err);
        }
    }

    public onConfigChanged(): void {
        if (this.dailyTimer) {
            clearTimeout(this.dailyTimer);
            this.dailyTimer = null;
        }
        this.scheduleDailySummary();
    }

    public dispose(): void {
        if (this.dailyTimer) {
            clearTimeout(this.dailyTimer);
            this.dailyTimer = null;
        }
    }
}
