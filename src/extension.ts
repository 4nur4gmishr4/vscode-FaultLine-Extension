import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AudioPlayer } from './audioPlayer';
import { FahhConfig, affectsFahh, readConfig, updateEnabled, updateSoundPath } from './config';
import { registerFailureDetectors } from './failureDetector';
import { Logger } from './logger';

const DEFAULT_SOUND_FILENAME = 'Fahhh.mp3';

class FahhExtension {
    private readonly logger: Logger;
    private readonly player: AudioPlayer;
    private readonly defaultSoundPath: string;
    private config: FahhConfig;
    private statusBar: vscode.StatusBarItem | null = null;
    private detectors: vscode.Disposable | null = null;
    private lastFailureAt = 0;

    public constructor(private readonly ctx: vscode.ExtensionContext) {
        this.logger = new Logger('Fahh');
        this.player = new AudioPlayer(this.logger);
        this.defaultSoundPath = path.join(ctx.extensionPath, DEFAULT_SOUND_FILENAME);
        this.config = readConfig();
        this.logger.setLevel(this.config.logLevel);
    }

    public start(): void {
        this.logger.info(`Fahh activating on ${process.platform} (VS Code ${vscode.version}).`);

        if (!fs.existsSync(this.defaultSoundPath)) {
            this.logger.error(`Default sound file missing: ${this.defaultSoundPath}`);
            void vscode.window.showErrorMessage(
                `Fahh: bundled sound "${DEFAULT_SOUND_FILENAME}" is missing. Reinstall the extension.`
            );
        }

        this.refreshStatusBar();
        this.registerDetectors();
        this.registerCommands();

        this.ctx.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration((event) => {
                if (!affectsFahh(event)) { return; }
                this.config = readConfig();
                this.logger.setLevel(this.config.logLevel);
                this.refreshStatusBar();
                this.logger.debug('Configuration reloaded.');
            }),
            this.player,
            this.logger,
            { dispose: () => this.statusBar?.dispose() },
            { dispose: () => this.detectors?.dispose() }
        );
    }

    private registerDetectors(): void {
        this.detectors = registerFailureDetectors(
            () => this.config,
            (event) => this.handleFailure(event.label),
            this.logger
        );
    }

    private handleFailure(label: string): void {
        if (!this.config.enabled) {
            this.logger.debug(`Failure ignored (disabled): ${label}`);
            return;
        }
        if (this.config.ignorePatterns.some((re) => re.test(label))) {
            this.logger.debug(`Failure ignored (pattern match): ${label}`);
            return;
        }
        const now = Date.now();
        if (now - this.lastFailureAt < this.config.cooldownMs) {
            this.logger.debug(`Failure suppressed by cooldown: ${label}`);
            return;
        }
        this.lastFailureAt = now;

        this.logger.info(`Failure: ${label}`);

        if (this.config.showNotification) {
            void vscode.window.showWarningMessage(`${label} — playing Fahhh`);
        }

        const soundPath = this.resolveSoundPath();
        this.player.play(soundPath, { volume: this.config.volume });
    }

    private resolveSoundPath(): string {
        const custom = this.config.soundPath;
        if (custom && fs.existsSync(custom)) {
            return custom;
        }
        if (custom) {
            this.logger.warn(`Custom sound path not found, falling back to default: ${custom}`);
        }
        return this.defaultSoundPath;
    }

    private refreshStatusBar(): void {
        if (!this.config.showStatusBar) {
            this.statusBar?.dispose();
            this.statusBar = null;
            return;
        }
        if (!this.statusBar) {
            this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
            this.statusBar.command = 'fahh.toggle';
        }
        if (this.config.enabled) {
            this.statusBar.text = '$(unmute) Fahh';
            this.statusBar.tooltip = 'Fahh is enabled — click to disable';
        } else {
            this.statusBar.text = '$(mute) Fahh';
            this.statusBar.tooltip = 'Fahh is disabled — click to enable';
        }
        this.statusBar.show();
    }

    private registerCommands(): void {
        this.ctx.subscriptions.push(
            vscode.commands.registerCommand('fahh.test', () => {
                this.logger.info('Manual test sound requested.');
                this.player.play(this.resolveSoundPath(), { volume: this.config.volume });
            }),
            vscode.commands.registerCommand('fahh.toggle', async () => {
                const next = !this.config.enabled;
                await updateEnabled(next);
                void vscode.window.showInformationMessage(`Fahh ${next ? 'enabled' : 'disabled'}.`);
            }),
            vscode.commands.registerCommand('fahh.selectSound', async () => {
                const picked = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    openLabel: 'Use this sound',
                    filters: { Audio: ['mp3', 'wav', 'ogg', 'flac'] }
                });
                if (!picked || picked.length === 0) { return; }
                const fsPath = picked[0].fsPath;
                await updateSoundPath(fsPath);
                void vscode.window.showInformationMessage(`Fahh sound set to ${fsPath}`);
            }),
            vscode.commands.registerCommand('fahh.resetSound', async () => {
                await updateSoundPath('');
                void vscode.window.showInformationMessage('Fahh sound reset to default.');
            }),
            vscode.commands.registerCommand('fahh.stop', () => {
                this.player.stop();
            }),
            vscode.commands.registerCommand('fahh.showOutput', () => {
                this.logger.show();
            })
        );
    }
}

export function activate(ctx: vscode.ExtensionContext): void {
    const extension = new FahhExtension(ctx);
    extension.start();
}

export function deactivate(): void {
    // ctx.subscriptions are auto-disposed by VS Code; nothing further required.
}
