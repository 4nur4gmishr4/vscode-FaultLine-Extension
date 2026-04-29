import * as vscode from 'vscode';

export type LogLevel = 'off' | 'error' | 'warn' | 'info' | 'debug';

const LEVEL_RANK: Record<LogLevel, number> = {
    off: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4
};

export class Logger {
    private readonly channel: vscode.OutputChannel;
    private level: LogLevel = 'warn';

    public constructor(name: string) {
        this.channel = vscode.window.createOutputChannel(name);
    }

    public setLevel(level: LogLevel): void {
        this.level = level;
    }

    public show(): void {
        this.channel.show(true);
    }

    public dispose(): void {
        this.channel.dispose();
    }

    public error(message: string, error?: unknown): void {
        if (!this.shouldLog('error')) { return; }
        const detail = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : error !== undefined ? String(error) : '';
        this.write('ERROR', detail ? `${message} :: ${detail}` : message);
    }

    public warn(message: string): void {
        if (!this.shouldLog('warn')) { return; }
        this.write('WARN', message);
    }

    public info(message: string): void {
        if (!this.shouldLog('info')) { return; }
        this.write('INFO', message);
    }

    public debug(message: string): void {
        if (!this.shouldLog('debug')) { return; }
        this.write('DEBUG', message);
    }

    private shouldLog(level: LogLevel): boolean {
        return LEVEL_RANK[level] <= LEVEL_RANK[this.level];
    }

    private write(tag: string, message: string): void {
        const timestamp = new Date().toISOString();
        this.channel.appendLine(`[${timestamp}] [${tag}] ${message}`);
    }
}
