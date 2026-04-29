import { execFile, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { isWSL, convertWSLPathToWindows } from './wsl';

export interface AudioOptions {
    volume: number; // 0-100
}

export class AudioPlayer {
    private playing = false;
    private currentChild: ChildProcess | null = null;
    private warnedMissingPlayer = false;
    private queue: { filePath: string; options: AudioOptions }[] = [];

    public constructor(private readonly logger: Logger) {}

    public play(filePath: string, options: AudioOptions): void {
        if (!filePath) {
            this.logger.error('Audio play failed: No file path provided.');
            return;
        }

        // Ensure absolute path
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);

        if (!fs.existsSync(absolutePath)) {
            this.logger.error(`Audio file not found: ${absolutePath}`);
            return;
        }

        if (this.playing) {
            this.queue.push({ filePath: absolutePath, options });
            this.logger.debug('Audio queued.');
            return;
        }

        this.playInternal(absolutePath, options);
    }

    private playInternal(absolutePath: string, options: AudioOptions): void {
        this.playing = true;
        const done = (err?: Error | null) => {
            this.playing = false;
            this.currentChild = null;
            if (err) {
                this.handleError(err);
            }
            if (this.queue.length > 0) {
                const next = this.queue.shift();
                if (next) {
                    this.playInternal(next.filePath, next.options);
                }
            }
        };

        try {
            this.spawn(absolutePath, options, done);
        } catch (e) {
            this.playing = false;
            this.currentChild = null;
            const error = e instanceof Error ? e : new Error(String(e));
            this.handleError(error);
            if (this.queue.length > 0) {
                const next = this.queue.shift();
                if (next) {
                    this.playInternal(next.filePath, next.options);
                }
            }
        }
    }

    public stop(): void {
        this.queue = [];
        if (this.currentChild) {
            try {
                this.currentChild.kill();
            } catch (e) {
                this.logger.error('Failed to kill audio child process', e);
            }
        }
        this.currentChild = null;
        this.playing = false;
    }

    public dispose(): void {
        this.stop();
    }

    private spawn(filePath: string, options: AudioOptions, done: (err?: Error | null) => void): void {
        const volume01 = Math.min(Math.max(options.volume, 0), 100) / 100;

        // WSL support: if on linux but in WSL, use powershell on windows host
        if (isWSL()) {
            const winPath = convertWSLPathToWindows(filePath);
            this.currentChild = this.playWindows(winPath, volume01, done);
            return;
        }

        switch (process.platform) {
            case 'win32': {
                this.currentChild = this.playWindows(filePath, volume01, done);
                return;
            }
            case 'darwin': {
                this.currentChild = execFile(
                    'afplay',
                    ['-v', volume01.toFixed(3), filePath],
                    (err) => done(err)
                );
                return;
            }
            default: {
                this.currentChild = this.playLinux(filePath, volume01, done);
                return;
            }
        }
    }

    private playWindows(filePath: string, volume01: number, done: (err?: Error | null) => void): ChildProcess {
        // Use the Win32 MCI API (winmm.dll) via P/Invoke. WPF MediaPlayer's MediaOpened
        // never fires from a non-UI PowerShell session because there is no Dispatcher
        // pumping messages. mciSendString is fully synchronous and works without a UI.
        // Volume is 0..1000 in MCI; map from our 0..1 range.
        const mciVolume = Math.round(Math.min(Math.max(volume01, 0), 1) * 1000);
        const alias = `fahh${Date.now().toString(36)}`;
        const pathBase64 = Buffer.from(filePath, 'utf16le').toString('base64');

        const lines = [
            "$ErrorActionPreference = 'Stop'",
            "$path = [System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String('" + pathBase64 + "'))",
            "$mci = Add-Type -PassThru -Namespace Fahh -Name Mci -MemberDefinition '[DllImport(\"winmm.dll\", CharSet=CharSet.Auto)] public static extern int mciSendString(string command, System.Text.StringBuilder buffer, int bufferSize, System.IntPtr hwndCallback);'",
            "$openCmd = 'open \"' + $path + '\" type mpegvideo alias " + alias + "'",
            "$rcOpen = $mci::mciSendString($openCmd, $null, 0, [System.IntPtr]::Zero)",
            "if ($rcOpen -ne 0) { exit 2 }",
            "$null = $mci::mciSendString('setaudio " + alias + " volume to " + mciVolume + "', $null, 0, [System.IntPtr]::Zero)",
            "$rcPlay = $mci::mciSendString('play " + alias + " wait', $null, 0, [System.IntPtr]::Zero)",
            "$null = $mci::mciSendString('close " + alias + "', $null, 0, [System.IntPtr]::Zero)",
            "if ($rcPlay -ne 0) { exit 3 }"
        ];
        const encodedScript = Buffer.from(lines.join('; '), 'utf16le').toString('base64');

        return execFile(
            'powershell.exe',
            [
                '-NoProfile',
                '-NonInteractive',
                '-ExecutionPolicy', 'Bypass',
                '-WindowStyle', 'Hidden',
                '-EncodedCommand', encodedScript
            ],
            { windowsHide: true },
            (err) => done(err)
        );
    }

    private playLinux(filePath: string, volume01: number, done: (err?: Error | null) => void): ChildProcess {
        const ffplayVolume = Math.round(volume01 * 100).toString();
        return execFile(
            'ffplay',
            ['-nodisp', '-autoexit', '-loglevel', 'quiet', '-volume', ffplayVolume, filePath],
            (err) => {
                if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
                    this.tryLinuxFallback(filePath, volume01, done);
                    return;
                }
                done(err);
            }
        );
    }

    private tryLinuxFallback(filePath: string, volume01: number, done: (err?: Error | null) => void): void {
        const paplayVolume = Math.round(volume01 * 65536).toString();
        this.currentChild = execFile(
            'paplay',
            ['--volume', paplayVolume, filePath],
            (err) => {
                if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
                    this.currentChild = execFile('aplay', ['-q', filePath], (err2) => done(err2));
                    return;
                }
                done(err);
            }
        );
    }

    private handleError(err: Error): void {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT' && !this.warnedMissingPlayer) {
            this.warnedMissingPlayer = true;
            const tool =
                process.platform === 'darwin' ? 'afplay'
                : process.platform === 'win32' ? 'powershell.exe'
                : 'ffplay (install ffmpeg) or paplay/aplay';
            this.logger.error(`Required audio player not found: ${tool}`);
        } else {
            this.logger.error('Audio playback failed', err);
        }
    }
}
