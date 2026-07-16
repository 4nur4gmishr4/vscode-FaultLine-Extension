import * as vscode from 'vscode';
import type { FaultLineConfig, FailureSource } from '../../domain/types/index';
import { Logger } from './logger';

// Constants for cleanup intervals
const CLEANUP_INTERVAL_MS = 60000; // 1 minute
const PER_MINUTE_WINDOW_MS = 60000; // 1 minute

/**
 * Manages rate limiting, cooldowns, quiet hours, and snooze functionality for the extension.
 *
 * Full-event mute (disabled / snooze / quiet hours / mute-when-focused) vs sound-only
 * throttling (cooldown / maxPerMinute).
 */
export class Scheduler {
    private snoozeEndAt: number = 0;
    private perMinuteWindow: number[] = [];
    private lastGlobalPlayAt = 0;
    private readonly lastPlayBySource = new Map<FailureSource, number>();
    private cleanupTimer: NodeJS.Timeout | null = null;
    private disposed = false;

    /**
     * Creates a new Scheduler instance.
     *
     * @param config - Function that returns the current extension configuration
     * @param logger - Logger instance for debug and info messages
     */
    public constructor(private readonly config: () => FaultLineConfig, private readonly logger: Logger) {
        // Periodically clean old per-minute entries
        this.cleanupTimer = setInterval(() => this.cleanPerMinuteWindow(), CLEANUP_INTERVAL_MS);
        this.cleanupTimer?.unref?.();
    }

    /**
     * Dispose of the scheduler and clean up resources.
     */
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    /**
     * Full-event mute: disabled, snooze, quiet hours, mute-when-focused.
     * Cooldown / maxPerMinute gate sounds only — see isSoundRateLimited.
     */
    public isMuted(source: FailureSource): boolean {
        const config = this.config();

        if (!config.core.enabled) {
            return true;
        }

        const now = Date.now();

        // Snooze
        if (now < this.snoozeEndAt) {
            this.logger.debug(`Muted by snooze: ${source}`);
            return true;
        }

        const cfg = config.detection;

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

        return false;
    }

    /**
     * Sound-only rate limiting: cooldownMs (+ optional per-source) and maxPerMinute.
     */
    public isSoundRateLimited(source: FailureSource): boolean {
        const cfg = this.config().detection;
        const now = Date.now();

        if (cfg.cooldownMs > 0) {
            const last = cfg.cooldownPerSource
                ? (this.lastPlayBySource.get(source) ?? 0)
                : this.lastGlobalPlayAt;
            if (now - last < cfg.cooldownMs) {
                this.logger.debug(`Sound rate-limited by cooldown: ${source}`);
                return true;
            }
        }

        this.cleanPerMinuteWindow();
        if (cfg.maxPerMinute > 0 && this.perMinuteWindow.length >= cfg.maxPerMinute) {
            this.logger.debug(`Sound rate-limited by max-per-minute: ${source}`);
            return true;
        }

        return false;
    }

    /**
     * Record a sound play for cooldown / max-per-minute tracking.
     */
    public record(source: FailureSource): void {
        const now = Date.now();
        this.perMinuteWindow.push(now);
        this.lastGlobalPlayAt = now;
        this.lastPlayBySource.set(source, now);
    }

    /**
     * Snooze audio playback for a specified number of minutes.
     */
    public snooze(minutes: number): void {
        const MILLISECONDS_PER_MINUTE = 60000;
        this.snoozeEndAt = Date.now() + minutes * MILLISECONDS_PER_MINUTE;
        this.logger.info(`Snoozed for ${minutes} minutes.`);
    }

    /**
     * Check if the scheduler is currently in snooze mode.
     */
    public isSnoozing(): boolean {
        return Date.now() < this.snoozeEndAt;
    }

    /**
     * Clear the active snooze and resume normal audio playback.
     */
    public clearSnooze(): void {
        this.snoozeEndAt = 0;
    }

    /**
     * Check if the current time falls within the configured quiet hours window.
     */
    private isInQuietHours(from: string, to: string): boolean {
        const fromMin = parseHHmm(from);
        const toMin = parseHHmm(to);
        if (fromMin === null || toMin === null) {
            return false;
        }
        const now = new Date();
        const current = now.getHours() * 60 + now.getMinutes();

        if (fromMin === toMin) {
            // Empty window
            return false;
        }
        if (fromMin < toMin) {
            // Same-day window: include start, exclude end
            return current >= fromMin && current < toMin;
        }
        // Crosses midnight
        return current >= fromMin || current < toMin;
    }

    /**
     * Remove expired entries from the per-minute tracking window.
     */
    private cleanPerMinuteWindow(): void {
        const cutoff = Date.now() - PER_MINUTE_WINDOW_MS;
        this.perMinuteWindow = this.perMinuteWindow.filter(t => t > cutoff);
    }
}

/**
 * Parse a time string in HH:mm format to minutes since midnight.
 */
function parseHHmm(value: string): number | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value);
    if (!match) { return null; }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) { return null; }
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) { return null; }
    return hours * 60 + minutes;
}
