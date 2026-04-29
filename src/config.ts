import * as vscode from 'vscode';
import type { LogLevel } from './logger';

export type FailureSource =
    | 'task'
    | 'shell'
    | 'terminal'
    | 'test'
    | 'debug'
    | 'diagnostics'
    | 'build'
    | 'longTask';

export type NotificationLevel = 'info' | 'warning' | 'error' | 'none';
export type VolumeCurve = 'linear' | 'log';

export interface QuietHours {
    enabled: boolean;
    from: string;
    to: string;
}

export interface PerSourceSounds {
    task: string;
    shell: string;
    terminal: string;
    test: string;
    debug: string;
    diagnostics: string;
    build: string;
}

export interface PerSourceVolumes {
    task: number;
    shell: number;
    terminal: number;
}

export interface FahhConfig {
    enabled: boolean;
    soundPath: string;
    soundFolder: string;
    sounds: PerSourceSounds;
    successEnabled: boolean;
    successSound: string;
    volumes: PerSourceVolumes;
    volume: number;
    volumeCurve: VolumeCurve;
    showNotification: boolean;
    notificationLevel: NotificationLevel;
    sources: ReadonlySet<FailureSource>;
    cooldownMs: number;
    cooldownPerSource: boolean;
    maxPerMinute: number;
    ignorePatterns: RegExp[];
    showStatusBar: boolean;
    statusBarCounter: boolean;
    flashStatusBar: boolean;
    quietHours: QuietHours;
    muteWhenFocused: boolean;
    snoozeMinutes: number;
    diagnosticsThreshold: number;
    longTaskThresholdMs: number;
    logLevel: LogLevel;
    historyMax: number;
    speakLabel: boolean;
    webhookUrl: string;
    aiSummaryEnabled: boolean;
    dailySummary: boolean;
    streakCounter: boolean;
    bossFightMode: boolean;
}

const SECTION = 'fahh';
const VALID_SOURCES: ReadonlySet<FailureSource> = new Set<FailureSource>([
    'task', 'shell', 'terminal', 'test', 'debug', 'diagnostics', 'build', 'longTask'
]);

export function readConfig(): FahhConfig {
    const cfg = vscode.workspace.getConfiguration(SECTION);

    const rawSources = cfg.get<string[]>('sources', ['task', 'shell', 'terminal']);
    const sources = new Set<FailureSource>(
        rawSources.filter((v): v is FailureSource => VALID_SOURCES.has(v as FailureSource))
    );

    const rawPatterns = cfg.get<string[]>('ignorePatterns', []);
    const ignorePatterns = compilePatterns(rawPatterns);

    const sounds: PerSourceSounds = {
        task: cfg.get<string>('sounds.task', '').trim(),
        shell: cfg.get<string>('sounds.shell', '').trim(),
        terminal: cfg.get<string>('sounds.terminal', '').trim(),
        test: cfg.get<string>('sounds.test', '').trim(),
        debug: cfg.get<string>('sounds.debug', '').trim(),
        diagnostics: cfg.get<string>('sounds.diagnostics', '').trim(),
        build: cfg.get<string>('sounds.build', '').trim()
    };

    const volumes: PerSourceVolumes = {
        task: clamp(cfg.get<number>('volumes.task', -1), -1, 100),
        shell: clamp(cfg.get<number>('volumes.shell', -1), -1, 100),
        terminal: clamp(cfg.get<number>('volumes.terminal', -1), -1, 100)
    };

    return {
        enabled: cfg.get<boolean>('enabled', true),
        soundPath: cfg.get<string>('soundPath', '').trim(),
        soundFolder: cfg.get<string>('soundFolder', '').trim(),
        sounds,
        successEnabled: cfg.get<boolean>('successEnabled', false),
        successSound: cfg.get<string>('successSound', '').trim(),
        volumes,
        volume: clamp(cfg.get<number>('volume', 100), 0, 100),
        volumeCurve: cfg.get<VolumeCurve>('volumeCurve', 'linear'),
        showNotification: cfg.get<boolean>('showNotification', true),
        notificationLevel: cfg.get<NotificationLevel>('notificationLevel', 'warning'),
        sources,
        cooldownMs: clamp(cfg.get<number>('cooldownMs', 1500), 0, 60000),
        cooldownPerSource: cfg.get<boolean>('cooldownPerSource', false),
        maxPerMinute: clamp(cfg.get<number>('maxPerMinute', 10), 0, 120),
        ignorePatterns,
        showStatusBar: cfg.get<boolean>('showStatusBar', true),
        statusBarCounter: cfg.get<boolean>('statusBarCounter', true),
        flashStatusBar: cfg.get<boolean>('flashStatusBar', true),
        quietHours: {
            enabled: cfg.get<boolean>('quietHours.enabled', false),
            from: cfg.get<string>('quietHours.from', '22:00'),
            to: cfg.get<string>('quietHours.to', '08:00')
        },
        muteWhenFocused: cfg.get<boolean>('muteWhenFocused', false),
        snoozeMinutes: clamp(cfg.get<number>('snoozeMinutes', 10), 1, 1440),
        diagnosticsThreshold: clamp(cfg.get<number>('diagnosticsThreshold', 1), 1, 100),
        longTaskThresholdMs: clamp(cfg.get<number>('longTaskThresholdMs', 60000), 1000, 3600000),
        logLevel: cfg.get<LogLevel>('logLevel', 'warn'),
        historyMax: clamp(cfg.get<number>('historyMax', 50), 10, 500),
        speakLabel: cfg.get<boolean>('speakLabel', false),
        webhookUrl: cfg.get<string>('webhookUrl', '').trim(),
        aiSummaryEnabled: cfg.get<boolean>('aiSummary.enabled', false),
        dailySummary: cfg.get<boolean>('dailySummary', false),
        streakCounter: cfg.get<boolean>('streakCounter', false),
        bossFightMode: cfg.get<boolean>('bossFightMode', false)
    };
}

export async function updateEnabled(enabled: boolean, target?: vscode.ConfigurationTarget): Promise<void> {
    const t = target ?? vscode.ConfigurationTarget.Global;
    await vscode.workspace.getConfiguration(SECTION).update('enabled', enabled, t);
}

export async function updateSoundPath(path: string): Promise<void> {
    await vscode.workspace.getConfiguration(SECTION).update('soundPath', path, vscode.ConfigurationTarget.Global);
}

export async function updateSoundFolder(path: string): Promise<void> {
    await vscode.workspace.getConfiguration(SECTION).update('soundFolder', path, vscode.ConfigurationTarget.Global);
}

export function affectsFahh(event: vscode.ConfigurationChangeEvent): boolean {
    return event.affectsConfiguration(SECTION);
}

function compilePatterns(patterns: string[]): RegExp[] {
    const compiled: RegExp[] = [];
    for (const pattern of patterns) {
        try {
            compiled.push(new RegExp(pattern));
        } catch {
            // Invalid regex; silently skip
        }
    }
    return compiled;
}

function clamp(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) { return min; }
    return Math.min(Math.max(value, min), max);
}
