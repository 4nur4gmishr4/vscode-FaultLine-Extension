import * as vscode from 'vscode';
import { FahhConfig, FailureSource } from './config';
import { Logger } from './logger';

export class Scheduler {
    private snoozeEndAt = 0;
    private perSourceLast: Map<FailureSource, number> = new Map();
    private perMinuteWindow: number[] = [];
    private snoozeDisposable: vscode.Disposable | null = null;
    private cleanupTimer: NodeJS.Timeout | null = null;

    public constructor(private readonly config: () => FahhConfig, private readonly logger: Logger) {
        // Periodically clean old per-minute entries
        this.cleanupTimer = setInterval(() => this.cleanPerMinuteWindow(), 60000);
        this.cleanupTimer?.unref?.();
    }

    public dispose(): void {
        this.snoozeDisposable?.dispose();
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
    }

    public isMuted(source: FailureSource): boolean {
        const cfg = this.config();

        if (!cfg.enabled) {
            return true;
        }

        const now = Date.now();

        // Snooze
        if (now < this.snoozeEndAt) {
            this.logger.debug(`Muted by snooze: ${source}`);
            return true;
        }

        // Quiet hours
        if (cfg.quietHours.enabled && this.isInQuietHours(cfg.quietHours.from, cfg.quietHours.to)) {
            this.logger.debug(`Muted by quiet hours: ${source}`);
            return true;
        }

        // Window focus mute
        if (cfg.muteWhenFocused && vscode.window.state.focused) {
            this.logger.debug(`Muted because window is focused: ${source}`);
            return true;
        }

        // Max per minute
        if (cfg.maxPerMinute > 0 && this.perMinuteWindow.length >= cfg.maxPerMinute) {
            this.logger.debug(`Muted by max-per-minute: ${source}`);
            return true;
        }

        // Cooldown
        const cooldown = cfg.cooldownMs;
        if (cooldown > 0) {
            const last = cfg.cooldownPerSource
                ? this.perSourceLast.get(source) ?? 0
                : Math.max(...Array.from(this.perSourceLast.values()), 0);
            if (now - last < cooldown) {
                this.logger.debug(`Muted by cooldown: ${source}`);
                return true;
            }
        }

        return false;
    }

    public record(source: FailureSource): void {
        const now = Date.now();
        this.perSourceLast.set(source, now);
        this.perMinuteWindow.push(now);
    }

    public snooze(minutes: number): void {
        this.snoozeEndAt = Date.now() + minutes * 60000;
        this.logger.info(`Snoozed for ${minutes} minutes.`);
        this.snoozeDisposable?.dispose();
        this.snoozeDisposable = vscode.workspace.onDidChangeConfiguration(() => {
            // If config changes, we might want to clear snooze, but keep it simple
        });
    }

    public isSnoozing(): boolean {
        return Date.now() < this.snoozeEndAt;
    }

    public clearSnooze(): void {
        this.snoozeEndAt = 0;
    }

    private isInQuietHours(from: string, to: string): boolean {
        const now = new Date();
        const current = now.getHours() * 60 + now.getMinutes();
        const [fromH, fromM] = from.split(':').map(Number);
        const [toH, toM] = to.split(':').map(Number);
        const fromMin = fromH * 60 + fromM;
        const toMin = toH * 60 + toM;

        if (fromMin <= toMin) {
            return current >= fromMin && current <= toMin;
        } else {
            // Crosses midnight
            return current >= fromMin || current <= toMin;
        }
    }

    private cleanPerMinuteWindow(): void {
        const cutoff = Date.now() - 60000;
        this.perMinuteWindow = this.perMinuteWindow.filter(t => t > cutoff);
    }
}
