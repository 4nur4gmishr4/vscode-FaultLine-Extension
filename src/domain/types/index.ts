/**
 * Shared type definitions for the FaultLine extension.
 */

export type LogLevel = 'off' | 'error' | 'warn' | 'info' | 'debug';

export type FailureSource =
    | 'task'
    | 'shell'
    | 'terminal'
    | 'diagnostics';

export type NotificationLevel = 'info' | 'warning' | 'error' | 'none';

export interface QuietHours {
    enabled: boolean;
    from: string;
    to: string;
}

export interface AudioConfig {
    soundsEnabled: boolean;
    soundPack: string;
    soundPath: string;
    soundFolder: string;
    successEnabled: boolean;
    successSound: string;
    volume: number;
}

export interface DetectionConfig {
    sources: ReadonlySet<FailureSource>;
    cooldownMs: number;
    cooldownPerSource: boolean;
    maxPerMinute: number;
    ignorePatterns: RegExp[];
    diagnosticsThreshold: number;
    branchPatterns: string[];
    quietHours: QuietHours;
    muteWhenFocused: boolean;
}

export interface WebhookConfig {
    url: string;
    allowedDomains: ReadonlyArray<string>;
    format: 'default' | 'slack' | 'discord';
    jiraEnabled: boolean;
    jiraUrl: string;
    jiraProject: string;
    jiraEmail: string;
}

export interface AIConfig {
    summaryEnabled: boolean;
    provider: string;
    model: string;
    errorExplanationEnabled: boolean;
    errorExplanationAutoShow: boolean;
}

export interface UIConfig {
    showNotification: boolean;
    notificationLevel: NotificationLevel;
    showStatusBar: boolean;
    flashStatusBar: boolean;
    statusBarCounter: boolean;
}

export interface CoreConfig {
    enabled: boolean;
    logLevel: LogLevel;
    snoozeMinutes: number;
    language: string;
    historyMax: number;
}

export interface FaultLineConfig {
    core: CoreConfig;
    audio: AudioConfig;
    detection: DetectionConfig;
    webhook: WebhookConfig;
    ai: AIConfig;
    ui: UIConfig;
}

export interface HistoryEntry {
    id: string;
    timestamp: number;
    source: FailureSource;
    label: string;
    output?: string;
    soundPath: string;
    executionTime?: number;
}

export interface AudioOptions {
    volume: number;
}

export interface FailureEvent {
    source: FailureSource;
    label: string;
    output?: string;
    timestamp: number;
    executionTime?: number;
}

export type FailureHandler = (event: FailureEvent) => void;
export type SuccessHandler = (event: { source: FailureSource; label: string; executionTime?: number }) => void;
