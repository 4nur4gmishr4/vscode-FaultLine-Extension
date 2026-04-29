import * as vscode from 'vscode';
import type { LogLevel } from './logger';

export type FailureSource = 'task' | 'shell' | 'terminal';

export interface FahhConfig {
    enabled: boolean;
    soundPath: string;
    showNotification: boolean;
    sources: ReadonlySet<FailureSource>;
    volume: number;
    cooldownMs: number;
    ignorePatterns: RegExp[];
    showStatusBar: boolean;
    logLevel: LogLevel;
}

const SECTION = 'fahh';
const VALID_SOURCES: ReadonlySet<FailureSource> = new Set<FailureSource>(['task', 'shell', 'terminal']);

export function readConfig(): FahhConfig {
    const cfg = vscode.workspace.getConfiguration(SECTION);

    const rawSources = cfg.get<string[]>('sources', ['task', 'shell', 'terminal']);
    const sources = new Set<FailureSource>(
        rawSources.filter((value): value is FailureSource => VALID_SOURCES.has(value as FailureSource))
    );

    const rawPatterns = cfg.get<string[]>('ignorePatterns', []);
    const ignorePatterns = compilePatterns(rawPatterns);

    return {
        enabled: cfg.get<boolean>('enabled', true),
        soundPath: cfg.get<string>('soundPath', '').trim(),
        showNotification: cfg.get<boolean>('showNotification', true),
        sources,
        volume: clamp(cfg.get<number>('volume', 100), 0, 100),
        cooldownMs: clamp(cfg.get<number>('cooldownMs', 1500), 0, 60000),
        ignorePatterns,
        showStatusBar: cfg.get<boolean>('showStatusBar', true),
        logLevel: cfg.get<LogLevel>('logLevel', 'warn')
    };
}

export async function updateEnabled(enabled: boolean): Promise<void> {
    await vscode.workspace
        .getConfiguration(SECTION)
        .update('enabled', enabled, vscode.ConfigurationTarget.Global);
}

export async function updateSoundPath(path: string): Promise<void> {
    await vscode.workspace
        .getConfiguration(SECTION)
        .update('soundPath', path, vscode.ConfigurationTarget.Global);
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
            // Invalid regex; silently skip — caller logs through Logger if it cares.
        }
    }
    return compiled;
}

function clamp(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) { return min; }
    return Math.min(Math.max(value, min), max);
}
