/**
 * Centralized constants for the Fahh extension.
 * Eliminates magic strings and numbers throughout the codebase.
 */

/**
 * Extension metadata constants
 */
export const EXTENSION = {
    /** Extension identifier */
    ID: 'fahh',
    /** Display name */
    NAME: 'Fahh',
    /** Current version (kept in sync with package.json `version` field). */
    VERSION: '2.4.0',
    /** Extension publisher */
    PUBLISHER: '4nur4gmishr4'
} as const;

/**
 * Configuration section and keys
 */
export const CONFIG = {
    /** Root configuration section */
    SECTION: 'fahh',
    
    /** Configuration keys */
    KEYS: {
        ENABLED: 'enabled',
        SOUND_PACK: 'soundPack',
        SOUND_PATH: 'soundPath',
        SOUND_FOLDER: 'soundFolder',
        SOUNDS: 'sounds',
        SUCCESS_ENABLED: 'successEnabled',
        SUCCESS_SOUND: 'successSound',
        VOLUMES: 'volumes',
        VOLUME: 'volume',
        VOLUME_CURVE: 'volumeCurve',
        SHOW_NOTIFICATION: 'showNotification',
        NOTIFICATION_LEVEL: 'notificationLevel',
        SOURCES: 'sources',
        COOLDOWN_MS: 'cooldownMs',
        COOLDOWN_PER_SOURCE: 'cooldownPerSource',
        MAX_PER_MINUTE: 'maxPerMinute',
        IGNORE_PATTERNS: 'ignorePatterns',
        SHOW_STATUS_BAR: 'showStatusBar',
        STATUS_BAR_COUNTER: 'statusBarCounter',
        FLASH_STATUS_BAR: 'flashStatusBar',
        QUIET_HOURS: 'quietHours',
        QUIET_HOURS_ENABLED: 'quietHours.enabled',
        QUIET_HOURS_FROM: 'quietHours.from',
        QUIET_HOURS_TO: 'quietHours.to',
        MUTE_WHEN_FOCUSED: 'muteWhenFocused',
        SNOOZE_MINUTES: 'snoozeMinutes',
        DIAGNOSTICS_THRESHOLD: 'diagnosticsThreshold',
        LONG_TASK_THRESHOLD_MS: 'longTaskThresholdMs',
        LOG_LEVEL: 'logLevel',
        HISTORY_MAX: 'historyMax',
        SPEAK_LABEL: 'speakLabel',
        WEBHOOK_URL: 'webhookUrl',
        WEBHOOK_ALLOWED_DOMAINS: 'webhookAllowedDomains',
        AI_SUMMARY_ENABLED: 'aiSummary.enabled',
        AI_PROVIDER: 'aiProvider',
        OPENROUTER_API_KEY: 'openrouterApiKey',
        OPENROUTER_MODEL: 'openrouterModel',
        DAILY_SUMMARY: 'dailySummary',
        STREAK_COUNTER: 'streakCounter',
        BOSS_FIGHT_MODE: 'bossFightMode',
        ERROR_EXPLANATION_ENABLED: 'errorExplanation.enabled',
        ERROR_EXPLANATION_AUTO_SHOW: 'errorExplanation.autoShow'
    }
} as const;

/**
 * Default sound paths and pack information
 */
export const SOUNDS = {
    /** Default sound file relative to resources */
    DEFAULT: 'packs/default/fahh.mp3',
    
    /** Default sound pack directory */
    DEFAULT_PACK_DIR: 'packs/default',
    
    /** Available sound packs */
    PACKS: {
        FAHH: 'fahh.mp3',
        FAHH_HARD: 'fahhhard.mp3',
        FART_REVERB: 'fartreverb.mp3',
        FAHH_DEEP: 'fahhdeep.mp3',
        FAHH_BROKE: 'fahhbroke.mp3',
        OH_SHIT: 'ohshit.mp3'
    }
} as const;

/**
 * Default configuration values
 */
export const DEFAULTS = {
    /** Default enabled state */
    ENABLED: true,
    
    /** Default sound pack */
    SOUND_PACK: 'fahh.mp3',
    
    /** Default volume (0-100) */
    VOLUME: 100,
    
    /** Default volume curve */
    VOLUME_CURVE: 'linear' as const,
    
    /** Default notification level */
    NOTIFICATION_LEVEL: 'warning' as const,
    
    /** Default sources to monitor */
    SOURCES: ['task', 'shell', 'terminal'] as const,
    
    /** Default cooldown in milliseconds */
    COOLDOWN_MS: 50,
    
    /** Default max sounds per minute (0 = unlimited) */
    MAX_PER_MINUTE: 0,
    
    /** Default quiet hours start time */
    QUIET_HOURS_FROM: '22:00',
    
    /** Default quiet hours end time */
    QUIET_HOURS_TO: '08:00',
    
    /** Default snooze duration in minutes */
    SNOOZE_MINUTES: 10,
    
    /** Default diagnostics threshold */
    DIAGNOSTICS_THRESHOLD: 1,
    
    /** Default long task threshold in milliseconds (1 minute) */
    LONG_TASK_THRESHOLD_MS: 60000,
    
    /** Default log level */
    LOG_LEVEL: 'warn' as const,
    
    /** Default maximum history entries */
    HISTORY_MAX: 50,
    
    /** Default AI provider */
    AI_PROVIDER: 'copilot',
    
    /** Default OpenRouter model */
    OPENROUTER_MODEL: 'meta-llama/llama-3.2-3b-instruct:free',
    
    /** Default boss HP */
    BOSS_HP: 100
} as const;

/**
 * Validation patterns and limits
 */
export const VALIDATION = {
    /** Time format pattern (HH:MM) */
    TIME_FORMAT: /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/,
    
    /** Volume range */
    VOLUME: {
        MIN: 0,
        MAX: 100,
        DEFAULT_PER_SOURCE: -1 // -1 means use global volume
    },
    
    /** Cooldown range (milliseconds) */
    COOLDOWN: {
        MIN: 0,
        MAX: 60000
    },
    
    /** Max per minute range */
    MAX_PER_MINUTE: {
        MIN: 0,
        MAX: 120
    },
    
    /** Snooze duration range (minutes) */
    SNOOZE: {
        MIN: 1,
        MAX: 1440 // 24 hours
    },
    
    /** Diagnostics threshold range */
    DIAGNOSTICS_THRESHOLD: {
        MIN: 1,
        MAX: 100
    },
    
    /** Long task threshold range (milliseconds) */
    LONG_TASK_THRESHOLD: {
        MIN: 1000,
        MAX: 3600000 // 1 hour
    },
    
    /** History size range */
    HISTORY: {
        MIN: 10,
        MAX: 500
    }
} as const;

/**
 * Resource paths relative to extension root.
 *
 * Only paths consumed by runtime code live here. Welcome-screen assets are
 * read inline from `welcome.ts` via `vscode.Uri.joinPath`; if you migrate
 * those reads to constants, add them back below.
 */
export const RESOURCES = {
    /** Logo image path */
    LOGO: 'resources/fahh-logo.jpeg',

    /** Sound packs directory */
    PACKS_DIR: 'resources/packs',

    /** Default pack directory */
    DEFAULT_PACK: 'resources/packs/default'
} as const;

/**
 * Webview panel identifiers
 */
export const WEBVIEW_PANELS = {
    ERROR_EXPLANATION: 'fahhErrorExplanation',
    WELCOME: 'fahhWelcome',
    AI_PROVIDER_WIZARD: 'fahhAiProviderWizard'
} as const;

