import { execFile, ChildProcess } from 'child_process';
import * as fs from 'fs';
import { Logger } from './logger';

export interface AudioOptions {
    volume: number; // 0-100
}

export class AudioPlayer {
    private playing = false;
    private currentChild: ChildProcess | null = null;
    private warnedMissingPlayer = false;

    public constructor(private readonly logger: Logger) {}

    public play(filePath: string, options: AudioOptions): void {
        if (this.playing) {
            this.logger.debug('Audio play skipped: already playing.');
            return;
        }
        if (!filePath) {
            this.logger.error('Audio play failed: No file path provided.');
            return;
        }
        if (!fs.existsSync(filePath)) {
            this.logger.error(`Audio file not found: ${filePath}`);
            return;
        }

        this.playing = true;
        const done = (err?: Error | null) => {
            this.playing = false;
            this.currentChild = null;
            if (err) {
                this.handleError(err);
            }
        };

        try {
            this.spawn(filePath, options, done);
        } catch (e) {
            this.playing = false;
            this.currentChild = null;
            const error = e instanceof Error ? e : new Error(String(e));
            this.handleError(error);
        }
    }

    public stop(): void {
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
        // Use Base64 encoding for the script and path to prevent any injection
        const script = [
            "$ErrorActionPreference = 'Stop'",
            'Add-Type -AssemblyName PresentationCore',
            `$path = [System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String('${Buffer.from(filePath, 'utf16le').toString('base64')}'))`,
            `$volume = ${volume01.toFixed(3)}`,
            '$player = New-Object System.Windows.Media.MediaPlayer',
            '$player.Volume = $volume',
            '$opened = $false',
            '$failed = $false',
            '$null = Register-ObjectEvent $player MediaOpened -Action { $script:opened = $true }',
            '$null = Register-ObjectEvent $player MediaFailed -Action { $script:failed = $true }',
            // Use New-Object System.Uri for more robust path handling
            '$player.Open((New-Object System.Uri($path, [System.UriKind]::Absolute)))',
            '$deadline = (Get-Date).AddSeconds(5)',
            'while (-not $opened -and -not $failed -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 50 }',
            'if ($opened -and $player.NaturalDuration.HasTimeSpan) {',
            '    $player.Play()',
            '    $ms = [int]$player.NaturalDuration.TimeSpan.TotalMilliseconds + 200',
            '    Start-Sleep -Milliseconds $ms',
            '}',
            '$player.Close()'
        ].join('; ');

        const encodedScript = Buffer.from(script, 'utf16le').toString('base64');

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
