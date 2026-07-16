import type { Memento } from 'vscode';
import type { FaultLineConfig, HistoryEntry } from '../../domain/types/index';
import { Logger } from './logger';

/**
 * Manages failure history tracking for FaultLine.
 * Persists entries to global state and enforces `historyMax`.
 * Used by AI "last failure", factory reset, and internal callers — not a sidebar view.
 *
 * @example
 * ```typescript
 * const historyManager = new HistoryManager(
 *   () => configManager.readConfig(),
 *   logger,
 *   context.globalState
 * );
 *
 * // Add a failure to history
 * historyManager.add({
 *   id: 'unique-id',
 *   timestamp: Date.now(),
 *   source: 'task',
 *   label: 'Build failed',
 *   soundPath: '/path/to/sound.mp3'
 * });
 *
 * // Get the most recent failure
 * const last = historyManager.getLast();
 * ```
 */
export class HistoryManager {
    private entries: HistoryEntry[] = [];

    /**
     * Creates a new HistoryManager instance.
     *
     * @param config - Function that returns the current extension configuration
     * @param logger - Logger instance for debug and info messages
     * @param state - VS Code Memento for persisting history across sessions (globalState)
     */
    public constructor(
        private readonly config: () => FaultLineConfig,
        private readonly logger: Logger,
        private readonly state: Memento
    ) {
        this.entries = this.state.get<HistoryEntry[]>('faultline.history', []);
    }

    /**
     * Adds a new failure entry to the history.
     * Entries are added to the beginning of the list (most recent first).
     * If the history exceeds the configured maximum size, oldest entries are removed.
     *
     * @param entry - The history entry to add
     */
    public add(entry: HistoryEntry): void {
        // Honor the user-configured cap (clamped in ConfigManager); never below 1.
        const max = Math.max(1, this.config().core.historyMax);

        // Ensure we have the latest state before modifying
        this.entries = this.state.get<HistoryEntry[]>('faultline.history', []);

        this.entries.unshift(entry);
        if (this.entries.length > max) {
            this.entries = this.entries.slice(0, max);
        }
        this.persist();
        this.logger.debug(`History added: ${entry.label}`);
    }

    /**
     * Clears all history entries.
     * This removes all entries from memory and persisted state.
     */
    public clear(): void {
        this.entries = [];
        this.persist();
        this.logger.info('History cleared.');
    }

    private persistQueue: Promise<void> = Promise.resolve();

    /**
     * Persists the current history entries to workspace state.
     * Uses a queue to ensure persistence operations are serialized.
     * Errors during persistence are logged but do not throw.
     */
    private persist(): void {
        this.persistQueue = this.persistQueue.then(() =>
            this.state.update('faultline.history', this.entries)
        ).catch((err: unknown) => {
            this.logger.warn(`Failed to persist history: ${err instanceof Error ? err.message : String(err)}`);
        });
    }

    /**
     * Gets the most recent history entry.
     *
     * @returns The most recent entry, or null if history is empty
     */
    public getLast(): HistoryEntry | null {
        return this.entries[0] ?? null;
    }

    /**
     * Gets all history entries.
     *
     * @returns Read-only array of all history entries, ordered from most recent to oldest
     */
    public getAll(): ReadonlyArray<HistoryEntry> {
        return this.entries;
    }
}
