import * as vscode from 'vscode';
import type { FaultLineConfig } from '../../domain/types/index';
import { Logger } from '../../shared/utils/logger';

/**
 * Manages the VS Code status bar item for the FaultLine extension.
 * 
 * This class handles the creation, updating, and visual effects of the status bar item,
 * including displaying the enabled/disabled state, daily failure counter, and flash effects
 * when failures occur. The status bar item provides quick access to toggle the extension
 * and displays real-time statistics.
 * 
 * @example
 * ```typescript
 * const statusBarManager = new StatusBarManager(
 *     () => configManager.readConfig(),
 *     logger,
 *     context.workspaceState
 * );
 * 
 * // Refresh the status bar display
 * statusBarManager.refresh();
 * 
 * // Flash the status bar on failure
 * statusBarManager.flash();
 * 
 * // Get current failure count
 * const count = statusBarManager.getFailCount();
 * ```
 */
export class StatusBarManager {
    private item: vscode.StatusBarItem | null = null;
    private soundsItem: vscode.StatusBarItem | null = null;
    private flashing = false;
    private flashTimer: ReturnType<typeof setTimeout> | null = null;
    private disposed = false;

    /**
     * Creates a new StatusBarManager instance.
     *
     * @param config - Function that returns the current extension configuration
     * @param logger - Logger instance for diagnostic output
     * @param getFailCount - Returns today's failure count for the optional counter badge
     */
    public constructor(
        private readonly config: () => FaultLineConfig,
        private readonly logger: Logger,
        private readonly getFailCount: () => number = () => 0
    ) {}

    /**
     * Dispose of the status bar item and clean up resources.
     * 
     * This method should be called when the extension is deactivated to properly
     * clean up the status bar item and prevent memory leaks.
     * 
     * @example
     * ```typescript
     * // In extension deactivation
     * statusBarManager.dispose();
     * ```
     */
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        if (this.flashTimer !== null) {
            clearTimeout(this.flashTimer);
            this.flashTimer = null;
        }
        this.flashing = false;
        this.item?.dispose();
        this.item = null;
        this.soundsItem?.dispose();
        this.soundsItem = null;
    }

    /**
     * Refresh the status bar item display based on current configuration and state.
     * 
     * This method updates the status bar text, tooltip, and visibility based on the
     * current configuration settings and failure count. It creates the status bar item
     * if it doesn't exist and the user has enabled the status bar display.
     * 
     * The status bar shows:
     * - An unmute icon when enabled, mute icon when disabled
     * - The extension name "FaultLine"
     * - An optional failure counter (if enabled in settings)
     * 
     * @example
     * ```typescript
     * // Refresh after configuration change
     * statusBarManager.refresh();
     * ```
     */
    public refresh(): void {
        if (this.disposed) {
            return;
        }
        try {
            const config = this.config();
            const cfg = config.ui;
            if (!cfg.showStatusBar) {
                this.item?.hide();
                this.soundsItem?.hide();
                return;
            }
            if (!this.item) {
                this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
                this.item.command = 'faultline.toggle';
            }
            if (!this.soundsItem) {
                this.soundsItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1);
                this.soundsItem.command = 'faultline.toggleSounds';
            }

            const enabled = config.core.enabled;
            const count = this.getFailCount();
            const counterBadge = cfg.statusBarCounter && count > 0 ? ` ($(error) ${count})` : '';
            this.item.text = enabled
                ? `$(pulse) FaultLine: ON${counterBadge}`
                : `$(circle-slash) FaultLine: OFF`;
            this.item.tooltip = enabled
                ? `FaultLine is ON (debugger and fault explainer). Click to disable.${cfg.statusBarCounter ? `\nFailures today: ${count}` : ''}`
                : 'FaultLine is OFF. Click to enable.';
            this.item.show();

            const soundsEnabled = config.audio.soundsEnabled;
            this.soundsItem.text = soundsEnabled ? `$(unmute) Sounds` : `$(mute) Sounds`;
            this.soundsItem.tooltip = soundsEnabled
                ? 'Sounds ON (optional notifier). Click to disable.'
                : 'Sounds OFF. Click to enable.';

            if (enabled) {
                this.soundsItem.show();
            } else {
                this.soundsItem.hide();
            }
        } catch (err) {
            this.logger.error('Status bar refresh failed', err);
        }
    }

    /**
     * Increment the failure counter and refresh the display.
     * 
     * This method is called when a new failure is detected. It triggers a refresh
     * of the status bar to display the updated counter value.
     * 
     * **Note**: The actual counter increment is handled by the caller updating
     * the workspace state. This method only refreshes the display.
     * 
     * @example
     * ```typescript
     * // After detecting a failure
     * statusBarManager.incrementCounter();
     * ```
     */
    public incrementCounter(): void {
        this.refresh();
    }

    /**
     * Reset the failure counter and refresh the display.
     * 
     * This method is typically called at the start of a new day or when the user
     * manually resets the counter. It triggers a refresh of the status bar to
     * display the reset counter value.
     * 
     * **Note**: The actual counter reset is handled by the caller updating
     * the workspace state. This method only refreshes the display.
     * 
     * @example
     * ```typescript
     * // Reset counter at midnight
     * statusBarManager.resetCounter();
     * ```
     */
    public resetCounter(): void {
        this.refresh();
    }

    /**
     * Flash the status bar with an error background color.
     * 
     * This method provides visual feedback when a failure occurs by temporarily
     * changing the status bar background to the error color. The flash lasts for
     * 1 second and only occurs if the flash feature is enabled in settings.
     * 
     * Multiple simultaneous flash requests are ignored to prevent overlapping animations.
     * 
     * @example
     * ```typescript
     * // Flash on failure detection
     * statusBarManager.flash();
     * ```
     */
    public flash(): void {
        if (this.disposed) {
            return;
        }
        try {
            const cfg = this.config().ui;
            if (!cfg.flashStatusBar || !this.item) {
                return;
            }
            if (this.flashing) {
                return;
            }
            this.flashing = true;
            const original = this.item.backgroundColor;
            this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            this.flashTimer = setTimeout(() => {
                this.flashTimer = null;
                if (this.item) {
                    this.item.backgroundColor = original;
                }
                this.flashing = false;
            }, 1000);
        } catch (err) {
            this.flashing = false;
            this.logger.error('Status bar flash failed', err);
        }
    }


}
