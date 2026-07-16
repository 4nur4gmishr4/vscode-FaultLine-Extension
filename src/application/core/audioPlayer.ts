import { execFile, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from '../../shared/utils/logger';
import { isWSL, convertWSLPathToWindows } from './wsl';
import type { AudioOptions } from '../../domain/types/index';

// Re-exported so existing imports from this module keep working.
export type { AudioOptions };



/**
 * Cross-platform audio player that supports Windows, macOS, Linux, and WSL.
 * Drop-on-busy: if a sound is already playing, additional play() calls reject.
 *
 * @example
 * ```typescript
 * const player = new AudioPlayer(logger);
 * await player.play('/path/to/sound.mp3', { volume: 80 });
 * player.stop(); // Stop current playback
 * player.dispose(); // Clean up resources
 * ```
 */
export class AudioPlayer {
    private playing = false;
    private currentChild: ChildProcess | null = null;
    private warnedMissingPlayer = false;
    private disposed = false;

    /**
     * Creates a new AudioPlayer instance.
     * @param logger - Logger instance for diagnostic output
     */
    public constructor(private readonly logger: Logger) {}

    /**
     * Plays an audio file with the specified volume.
     * If audio is currently playing, the call is rejected (not queued).
     *
     * @param filePath - Absolute or relative path to the audio file
     * @param options - Audio playback options including volume (0-100)
     * @returns Promise that resolves when playback completes
     * @throws {Error} If file path is empty, file not found, or already playing
     *
     * @example
     * ```typescript
     * await player.play('/sounds/success.mp3', { volume: 75 });
     * ```
     */
    public async play(filePath: string, options: AudioOptions): Promise<void> {
        if (this.disposed) {
            return Promise.reject(new Error('Audio player disposed.'));
        }
        if (!filePath) {
            const msg = 'Audio play failed: No file path provided.';
            this.logger.error(msg);
            return Promise.reject(new Error(msg));
        }

        // Ensure absolute path
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);

        try {
            await fs.promises.access(absolutePath);
        } catch {
            const msg = `Audio file not found: ${absolutePath}`;
            this.logger.error(msg);
            return Promise.reject(new Error(msg));
        }

        return new Promise<void>((resolve, reject) => {
            if (this.playing) {
                const msg = 'Audio dropped due to currently playing.';
                this.logger.debug(msg);
                reject(new Error(msg));
                return;
            }
            this.playInternal(absolutePath, options, resolve, reject);
        });
    }

    private playInternal(
        absolutePath: string,
        options: AudioOptions,
        resolve: () => void,
        reject: (err: Error) => void
    ): void {
        this.playing = true;
        const done = (err?: Error | null) => {
            this.playing = false;
            this.currentChild = null;
            if (err) {
                this.handleError(err);
                reject(err instanceof Error ? err : new Error(String(err)));
            } else {
                resolve();
            }
        };

        try {
            this.spawn(absolutePath, options, done);
        } catch (e) {
            this.playing = false;
            this.currentChild = null;
            const error = e instanceof Error ? e : new Error(String(e));
            this.handleError(error);
            reject(error);
        }
    }

    /**
     * Stops the currently playing audio, if any.
     *
     * @example
     * ```typescript
     * player.stop(); // Immediately stops playback
     * ```
     */
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

    /**
     * Disposes of the audio player and releases all resources.
     * Stops any playing audio.
     */
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.stop();
    }

    private spawn(filePath: string, options: AudioOptions, done: (err?: Error | null) => void): void {
        const volume01 = Math.min(Math.max(options.volume, 0), 100) / 100;

        // Resolve the launch target asynchronously, then re-check `this.playing`
        // *immediately* before spawning so that a `stop()` call during the WSL
        // probe / path conversion doesn't leave a stray child process behind.
        void (async () => {
            try {
                let targetPath = filePath;
                let useWindowsPlayer = process.platform === 'win32';

                if (process.platform === 'linux' && await isWSL()) {
                    targetPath = await convertWSLPathToWindows(filePath);
                    useWindowsPlayer = true;
                }

                if (!this.playing) {
                    done(new Error('Audio playback stopped.'));
                    return;
                }

                if (useWindowsPlayer) {
                    this.currentChild = this.playWindows(targetPath, volume01, done);
                    return;
                }

                if (process.platform === 'darwin') {
                    this.currentChild = execFile(
                        'afplay',
                        ['-v', volume01.toFixed(3), targetPath],
                        (err) => done(err)
                    );
                    return;
                }

                this.currentChild = this.playLinux(targetPath, volume01, done);
            } catch (err) {
                this.logger.error('Failed to spawn audio player', err);
                done(err instanceof Error ? err : new Error(String(err)));
            }
        })();
    }

    /**
     * Escapes a path for safe embedding inside a double-quoted VBScript string literal.
     * VBScript escapes a literal quote by doubling it (`""`); CR/LF would terminate the
     * statement, so they are stripped. Without this, a path containing `"` could break out
     * of the string and inject arbitrary VBScript executed by cscript.
     */
    private escapeForVbsString(value: string): string {
        return value.replace(/[\r\n]/g, '').replace(/"/g, '""');
    }

    private playWindows(filePath: string, volume01: number, done: (err?: Error | null) => void): ChildProcess {
        const vol = Math.round(Math.min(Math.max(volume01, 0), 1) * 100);
        const safePath = this.escapeForVbsString(filePath);
        const scriptContent = `
Set Sound = CreateObject("WMPlayer.OCX.7")
Sound.URL = "${safePath}"
Sound.settings.volume = ${vol}
Sound.controls.play
WScript.Sleep 500
While Sound.playState <> 1 And Sound.playState <> 8
    WScript.Sleep 100
Wend
WScript.Echo "FAULTLINE_OK"
`;
        
        const vbsPath = path.join(os.tmpdir(), `faultline_play_${Date.now()}_${Math.floor(Math.random() * 1000)}.vbs`);
        // Small temp script only — sync write keeps ChildProcess return semantics simple.
        fs.writeFileSync(vbsPath, scriptContent, 'utf8');

        this.logger.debug(`Spawning cscript.exe (vol=${vol}, file=${filePath})`);

        const child = execFile(
            'cscript.exe',
            ['//nologo', vbsPath],
            { windowsHide: true, maxBuffer: 1024 * 1024 },
            (err, stdout, stderr) => {
                try {
                    if (fs.existsSync(vbsPath)) {
                        fs.unlinkSync(vbsPath);
                    }
                } catch (e) {
                    this.logger.error('Failed to clean up VBScript file', e);
                }

                if (err) {
                    const trimmedErr = (stderr || '').trim().slice(0, 500);
                    const trimmedOut = (stdout || '').trim().slice(0, 500);
                    this.logger.error(`VBScript audio exited code=${err.code ?? '?'} stderr=${trimmedErr || '<empty>'} stdout=${trimmedOut || '<empty>'}`);
                } else if (!/FAULTLINE_OK/.test(stdout || '')) {
                    this.logger.warn(`VBScript audio finished without FAULTLINE_OK marker. stdout=${(stdout || '').trim().slice(0, 200)}`);
                } else {
                    this.logger.debug('VBScript audio finished cleanly.');
                }
                done(err);
            }
        );
        return child;
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
