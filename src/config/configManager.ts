import * as vscode from 'vscode';
import { CONFIG, DEFAULTS, VALIDATION } from './constants';
import { SecretManager, ISecretManager } from './secretManager';
import { getProvider, listProviders } from '../services/aiProviders';
import type { Logger } from '../utils/logger';
import type {
    FaultLineConfig,
    FailureSource,
    NotificationLevel,
    
    
    
    LogLevel
} from '../types';

/**
 * Manages extension configuration with validation, type safety, and secure credential access.
 * 
 * This class provides a centralized interface for reading and updating extension configuration,
 * integrating with VS Code's configuration system and SecretManager for secure API key storage.
 * All configuration keys are accessed through the CONSTANTS module to eliminate magic strings.
 * 
 * @example
 * ```typescript
 * const configManager = new ConfigManager(context.secrets);
 * 
 * // Read configuration
 * const config = configManager.readConfig();
 * 
 * // Get AI API key securely
 * const apiKey = await configManager.getAiApiKey();
 * 
 * // Update configuration
 * await configManager.updateEnabled(false);
 * ```
 */
export class ConfigManager {
    private readonly secretManager: ISecretManager;
    private readonly logger?: Logger;
    private readonly validSources: ReadonlySet<FailureSource> = new Set<FailureSource>([
        'task', 'shell', 'terminal', 'diagnostics', 'build', 'longTask'
    ]);
    private readonly knownProviders: ReadonlySet<string> = new Set(
        listProviders().map((p: { id: string }) => p.id)
    );

    /**
     * Creates a new ConfigManager instance.
     *
     * @param secretStorage - VS Code's SecretStorage instance from ExtensionContext
     * @param logger - Optional logger; when provided, validation warnings go through
     *                the extension's structured log channel instead of `console.warn`
     */
    constructor(secretStorage: vscode.SecretStorage, logger?: Logger) {
        this.secretManager = new SecretManager(secretStorage);
        this.logger = logger;
    }

    /**
     * Emit a warning through the configured logger if available, otherwise fall
     * back to `console.warn` so test environments without a Logger still see it.
     *
     * @private
     */
    private warn(message: string): void {
        if (this.logger) {
            this.logger.warn(message);
        } else {
            console.warn(message);
        }
    }

    /**
     * Read and validate the current extension configuration.
     * 
     * This method reads all configuration values from VS Code's workspace configuration,
     * validates them against defined constraints, and returns a fully typed configuration object.
     * Invalid values are clamped to valid ranges or replaced with defaults.
     * 
     * **SECURITY FIX**: This method reads the AI provider from user configuration using
     * `cfg.get<string>('aiProvider', 'copilot')` instead of hardcoding "openrouter".
     * API keys are NOT read from configuration - use `getAiApiKey()` instead.
     * 
     * @returns Validated configuration object with all settings
     * 
     * @example
     * ```typescript
     * const config = configManager.readConfig();
     * console.log(`Extension enabled: ${config.enabled}`);
     * console.log(`AI provider: ${config.ai.provider}`);
     * ```
     */
    readConfig(): FaultLineConfig {
        const cfg = vscode.workspace.getConfiguration(CONFIG.SECTION);

        // Read and validate sources
        const rawSources = cfg.get<string[]>(CONFIG.KEYS.SOURCES, DEFAULTS.SOURCES as unknown as string[]);
        const sources = new Set<FailureSource>(
            rawSources.filter((v): v is FailureSource => this.validSources.has(v as FailureSource))
        );

        // Read and compile ignore patterns
        const rawPatterns = cfg.get<string[]>(CONFIG.KEYS.IGNORE_PATTERNS, []);
        const ignorePatterns = this.compilePatterns(rawPatterns);

        // Validate quiet hours format
        const quietHoursFrom = cfg.get<string>(CONFIG.KEYS.QUIET_HOURS_FROM, DEFAULTS.QUIET_HOURS_FROM);
        const quietHoursTo = cfg.get<string>(CONFIG.KEYS.QUIET_HOURS_TO, DEFAULTS.QUIET_HOURS_TO);
        
        if (!VALIDATION.TIME_FORMAT.test(quietHoursFrom)) {
            this.warn(`Invalid quiet hours 'from' format: ${quietHoursFrom}. Using default ${DEFAULTS.QUIET_HOURS_FROM}`);
        }
        if (!VALIDATION.TIME_FORMAT.test(quietHoursTo)) {
            this.warn(`Invalid quiet hours 'to' format: ${quietHoursTo}. Using default ${DEFAULTS.QUIET_HOURS_TO}`);
        }

        const rawProvider = cfg.get<string>(CONFIG.KEYS.AI_PROVIDER, DEFAULTS.AI_PROVIDER).toLowerCase();
        const aiProvider = this.knownProviders.has(rawProvider) ? rawProvider : DEFAULTS.AI_PROVIDER;
        if (rawProvider !== aiProvider) {
            this.warn(`Unknown AI provider "${rawProvider}". Falling back to "${DEFAULTS.AI_PROVIDER}".`);
        }

        return {
            core: {
                enabled: cfg.get<boolean>(CONFIG.KEYS.ENABLED, DEFAULTS.ENABLED),
                logLevel: cfg.get<LogLevel>(CONFIG.KEYS.LOG_LEVEL, DEFAULTS.LOG_LEVEL),
                snoozeMinutes: this.clamp(
                    cfg.get<number>(CONFIG.KEYS.SNOOZE_MINUTES, DEFAULTS.SNOOZE_MINUTES),
                    VALIDATION.SNOOZE.MIN,
                    VALIDATION.SNOOZE.MAX
                ),
                language: cfg.get<string>(CONFIG.KEYS.LANGUAGE, DEFAULTS.LANGUAGE),
            },
            audio: {
                soundPack: cfg.get<string>(CONFIG.KEYS.SOUND_PACK, DEFAULTS.SOUND_PACK),
                soundPath: cfg.get<string>(CONFIG.KEYS.SOUND_PATH, '').trim(),
                soundFolder: cfg.get<string>(CONFIG.KEYS.SOUND_FOLDER, '').trim(),
                successEnabled: cfg.get<boolean>(CONFIG.KEYS.SUCCESS_ENABLED, false),
                successSound: cfg.get<string>(CONFIG.KEYS.SUCCESS_SOUND, '').trim(),
                volume: this.clamp(
                    cfg.get<number>(CONFIG.KEYS.VOLUME, DEFAULTS.VOLUME),
                    VALIDATION.VOLUME.MIN,
                    VALIDATION.VOLUME.MAX
                ),
            },
            detection: {
                sources,
                cooldownMs: this.clamp(
                    cfg.get<number>(CONFIG.KEYS.COOLDOWN_MS, DEFAULTS.COOLDOWN_MS),
                    VALIDATION.COOLDOWN.MIN,
                    VALIDATION.COOLDOWN.MAX
                ),
                cooldownPerSource: cfg.get<boolean>(CONFIG.KEYS.COOLDOWN_PER_SOURCE, false),
                maxPerMinute: this.clamp(
                    cfg.get<number>(CONFIG.KEYS.MAX_PER_MINUTE, DEFAULTS.MAX_PER_MINUTE),
                    VALIDATION.MAX_PER_MINUTE.MIN,
                    VALIDATION.MAX_PER_MINUTE.MAX
                ),
                ignorePatterns,
                diagnosticsThreshold: this.clamp(
                    cfg.get<number>(CONFIG.KEYS.DIAGNOSTICS_THRESHOLD, DEFAULTS.DIAGNOSTICS_THRESHOLD),
                    VALIDATION.DIAGNOSTICS_THRESHOLD.MIN,
                    VALIDATION.DIAGNOSTICS_THRESHOLD.MAX
                ),
                longTaskThresholdMs: this.clamp(
                    cfg.get<number>(CONFIG.KEYS.LONG_TASK_THRESHOLD_MS, DEFAULTS.LONG_TASK_THRESHOLD_MS),
                    VALIDATION.LONG_TASK_THRESHOLD.MIN,
                    VALIDATION.LONG_TASK_THRESHOLD.MAX
                ),
                branchPatterns: cfg.get<string[]>(CONFIG.KEYS.BRANCH_PATTERNS, []),
                quietHours: {
                    enabled: cfg.get<boolean>(CONFIG.KEYS.QUIET_HOURS_ENABLED, false),
                    from: VALIDATION.TIME_FORMAT.test(quietHoursFrom) ? quietHoursFrom : DEFAULTS.QUIET_HOURS_FROM,
                    to: VALIDATION.TIME_FORMAT.test(quietHoursTo) ? quietHoursTo : DEFAULTS.QUIET_HOURS_TO
                },
                muteWhenFocused: cfg.get<boolean>(CONFIG.KEYS.MUTE_WHEN_FOCUSED, false),
            },
            webhook: {
                url: cfg.get<string>(CONFIG.KEYS.WEBHOOK_URL, '').trim(),
                allowedDomains: this.normalizeDomainList(
                    cfg.get<string[]>(CONFIG.KEYS.WEBHOOK_ALLOWED_DOMAINS, [])
                ),
                format: cfg.get<'default' | 'slack' | 'discord'>(CONFIG.KEYS.WEBHOOK_FORMAT, DEFAULTS.WEBHOOK_FORMAT),
                jiraUrl: cfg.get<string>(CONFIG.KEYS.JIRA_URL, DEFAULTS.JIRA_URL).trim(),
                jiraProject: cfg.get<string>(CONFIG.KEYS.JIRA_PROJECT, DEFAULTS.JIRA_PROJECT).trim(),
                jiraEmail: cfg.get<string>(CONFIG.KEYS.JIRA_EMAIL, DEFAULTS.JIRA_EMAIL).trim()
            },
            ai: {
                summaryEnabled: cfg.get<boolean>(CONFIG.KEYS.AI_SUMMARY_ENABLED, false),
                provider: aiProvider,
                model: cfg.get<string>(CONFIG.KEYS.MODEL, DEFAULTS.MODEL),
                errorExplanationEnabled: cfg.get<boolean>(CONFIG.KEYS.ERROR_EXPLANATION_ENABLED, true),
                errorExplanationAutoShow: cfg.get<boolean>(CONFIG.KEYS.ERROR_EXPLANATION_AUTO_SHOW, true)
            },
            ui: {
                showNotification: cfg.get<boolean>(CONFIG.KEYS.SHOW_NOTIFICATION, true),
                notificationLevel: cfg.get<NotificationLevel>(CONFIG.KEYS.NOTIFICATION_LEVEL, DEFAULTS.NOTIFICATION_LEVEL),
                showStatusBar: cfg.get<boolean>(CONFIG.KEYS.SHOW_STATUS_BAR, true),
                flashStatusBar: cfg.get<boolean>(CONFIG.KEYS.FLASH_STATUS_BAR, true)
            }
        };
    }


    /**
     * Get the AI provider API key securely from SecretManager.
     * 
     * This method retrieves the API key for the currently configured AI provider
     * from VS Code's secure secret storage. It automatically determines which provider
     * is active and retrieves the appropriate key.
     * 
     * **SECURITY**: API keys are stored in VS Code's SecretStorage, which encrypts
     * credentials at rest. They are NEVER stored in plaintext configuration.
     * 
     * @returns The API key for the current AI provider, or null if not configured
     * @throws {Error} If the AI provider is not supported
     * 
     * @example
     * ```typescript
     * const apiKey = await configManager.getAiApiKey();
     * if (apiKey) {
     *     console.log('API key is configured');
     * } else {
     *     console.log('No API key found - user needs to configure it');
     * }
     * ```
     */
    async getAiApiKey(): Promise<string | null> {
        const config = this.readConfig();
        const provider = config.ai.provider.toLowerCase();

        // Copilot uses VS Code's Language Model API (no key needed)
        if (provider === 'copilot') {
            return null;
        }

        // For every other registered provider, the key lives in SecretStorage.
        // Unknown ids should never reach here because `readConfig` validates against
        // the registry, but guard explicitly for defence in depth.
        if (!getProvider(provider)) {
            throw new Error(`Unsupported AI provider: ${provider}`);
        }
        return await this.secretManager.getApiKey(provider);
    }

    /**
     * Update the enabled state of the extension.
     * 
     * @param enabled - Whether the extension should be enabled
     * @param target - Configuration target (Global, Workspace, WorkspaceFolder)
     * @throws {Error} If the configuration update fails
     * 
     * @example
     * ```typescript
     * // Disable globally
     * await configManager.updateEnabled(false, vscode.ConfigurationTarget.Global);
     * 
     * // Enable for current workspace
     * await configManager.updateEnabled(true, vscode.ConfigurationTarget.Workspace);
     * ```
     */
    async updateEnabled(enabled: boolean, target?: vscode.ConfigurationTarget): Promise<void> {
        const t = target ?? vscode.ConfigurationTarget.Global;
        await vscode.workspace.getConfiguration(CONFIG.SECTION).update(CONFIG.KEYS.ENABLED, enabled, t);
    }

    /**
     * Update the custom sound path.
     * 
     * @param path - Path to the custom sound file
     * @throws {Error} If the configuration update fails
     * 
     * @example
     * ```typescript
     * await configManager.updateSoundPath('/path/to/custom/sound.mp3');
     * ```
     */
    async updateSoundPath(path: string): Promise<void> {
        await vscode.workspace.getConfiguration(CONFIG.SECTION).update(
            CONFIG.KEYS.SOUND_PATH,
            path,
            vscode.ConfigurationTarget.Global
        );
    }

    /**
     * Update the custom sound folder path.
     * 
     * @param path - Path to the folder containing sound files
     * @throws {Error} If the configuration update fails
     * 
     * @example
     * ```typescript
     * await configManager.updateSoundFolder('/path/to/sounds/');
     * ```
     */
    async updateSoundFolder(path: string): Promise<void> {
        await vscode.workspace.getConfiguration(CONFIG.SECTION).update(
            CONFIG.KEYS.SOUND_FOLDER,
            path,
            vscode.ConfigurationTarget.Global
        );
    }

    /**
     * Check if a configuration change event affects the Fahh extension.
     * 
     * @param event - VS Code configuration change event
     * @returns True if the change affects Fahh configuration
     * 
     * @example
     * ```typescript
     * vscode.workspace.onDidChangeConfiguration(event => {
     *     if (configManager.affectsFaultLine(event)) {
     *         console.log('Fahh configuration changed - reloading...');
     *         const newConfig = configManager.readConfig();
     *     }
     * });
     * ```
     */
    affectsFaultLine(event: vscode.ConfigurationChangeEvent): boolean {
        return event.affectsConfiguration(CONFIG.SECTION);
    }

    /**
     * Reset all Fahh settings to their default values.
     * 
     * This method removes all user-configured values at all configuration levels
     * (Global, Workspace, WorkspaceFolder), effectively resetting the extension
     * to its default state.
     * 
     * **WARNING**: This operation cannot be undone. All customizations will be lost.
     * 
     * @throws {Error} If the configuration reset fails
     * 
     * @example
     * ```typescript
     * await configManager.resetAllSettings();
     * console.log('All settings reset to defaults');
     * ```
     */
    async resetAllSettings(): Promise<void> {
        const cfg = vscode.workspace.getConfiguration(CONFIG.SECTION);
        const info = cfg.inspect('');
        if (!info) { 
            return; 
        }

        const keys = [
            ...Object.keys(info.globalValue || {}),
            ...Object.keys(info.workspaceValue || {}),
            ...Object.keys(info.workspaceFolderValue || {})
        ];

        const uniqueKeys = Array.from(new Set(keys));
        for (const key of uniqueKeys) {
            await cfg.update(key, undefined, vscode.ConfigurationTarget.Global);
            await cfg.update(key, undefined, vscode.ConfigurationTarget.Workspace);
            await cfg.update(key, undefined, vscode.ConfigurationTarget.WorkspaceFolder);
        }
    }

    /**
     * Compile regex patterns from string patterns, skipping invalid patterns.
     * 
     * @param patterns - Array of regex pattern strings
     * @returns Array of compiled RegExp objects
     * @private
     */
    private compilePatterns(patterns: string[]): RegExp[] {
        const compiled: RegExp[] = [];
        for (const pattern of patterns) {
            try {
                compiled.push(new RegExp(pattern));
            } catch {
                this.warn(`Invalid regex pattern ignored: ${pattern}`);
            }
        }
        return compiled;
    }

    /**
     * Clamp a numeric value to a valid range.
     * 
     * @param value - The value to clamp
     * @param min - Minimum allowed value
     * @param max - Maximum allowed value
     * @returns The clamped value
     * @private
     */
    private clamp(value: number, min: number, max: number): number {
        if (Number.isNaN(value)) { 
            return min; 
        }
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Normalize an array of host names into a deduplicated, lowercased list.
     *
     * Strips empty strings, trims whitespace, lowercases hosts, and removes
     * exact duplicates so callers can do a plain `Set.has` check.
     *
     * @private
     */
    private normalizeDomainList(input: unknown): string[] {
        if (!Array.isArray(input)) { return []; }
        const seen = new Set<string>();
        const out: string[] = [];
        for (const raw of input) {
            if (typeof raw !== 'string') { continue; }
            const host = raw.trim().toLowerCase();
            if (host.length === 0 || seen.has(host)) { continue; }
            seen.add(host);
            out.push(host);
        }
        return out;
    }
}

