import * as vscode from 'vscode';
import * as fs from 'fs';
import { AudioPlayer } from './audioPlayer';
import { FahhConfig, FailureSource, affectsFahh, readConfig, updateEnabled, updateSoundPath, updateSoundFolder, resetAllSettings } from './config';
import { registerFailureDetectors, FailureHandler, SuccessHandler } from './failureDetector';
import { Logger } from './logger';
import { Scheduler } from './scheduler';
import { SoundResolver } from './soundResolver';
import { StatusBarManager } from './statusBar';
import { HistoryManager, HistoryEntry } from './history';
import { IntegrationsManager } from './integrations';
import { WelcomePanel } from './welcome';

class FahhExtension {
    private readonly logger: Logger;
    private readonly player: AudioPlayer;
    private readonly scheduler: Scheduler;
    private readonly soundResolver: SoundResolver;
    private readonly statusBar: StatusBarManager;
    private readonly history: HistoryManager;
    private readonly integrations: IntegrationsManager;
    private config: FahhConfig;
    private detectors: vscode.Disposable | null = null;
    private historyView: vscode.TreeView<vscode.TreeItem> | null = null;

    public constructor(private readonly ctx: vscode.ExtensionContext) {
        this.logger = new Logger('Fahh');
        this.player = new AudioPlayer(this.logger);
        this.config = readConfig();
        this.logger.setLevel(this.config.logLevel);
        this.scheduler = new Scheduler(() => this.config, this.logger);
        this.soundResolver = new SoundResolver(ctx.extensionPath, () => this.config, this.logger);
        this.statusBar = new StatusBarManager(() => this.config, this.logger);
        this.history = new HistoryManager(() => this.config, this.logger, ctx.globalState);
        this.integrations = new IntegrationsManager(() => this.config, this.logger, ctx.globalState);
    }

    public start(): void {
        this.logger.info(`Fahh v2.1 activating on ${process.platform} (VS Code ${vscode.version}).`);

        this.statusBar.refresh();
        this.registerDetectors();
        this.registerCommands();
        this.registerHistoryView();

        void this.maybeShowWelcomeOnInstall();

        this.ctx.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration((event) => {
                if (!affectsFahh(event)) { return; }
                this.config = readConfig();
                this.logger.setLevel(this.config.logLevel);
                this.statusBar.refresh();
                this.integrations.onConfigChanged();
                this.logger.debug('Configuration reloaded.');
            }),
            this.player,
            this.logger,
            this.scheduler,
            this.statusBar,
            this.history,
            this.integrations,
            { dispose: () => this.detectors?.dispose() },
            { dispose: () => this.historyView?.dispose() }
        );
    }

    private async maybeShowWelcomeOnInstall(): Promise<void> {
        const version = this.ctx.extension.packageJSON.version as string;
        const lastVersion = this.ctx.globalState.get<string>('lastVersion');
        if (shouldShowWelcome(lastVersion, version)) {
            WelcomePanel.createOrShow(this.ctx.extensionUri);
        }
        if (lastVersion !== version) {
            try {
                await this.ctx.globalState.update('lastVersion', version);
            } catch (err) {
                this.logger.warn(`Failed to persist lastVersion: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
    }

    private registerDetectors(): void {
        const onFailure: FailureHandler = (event) => this.handleFailure(event.source, event.label);
        const onSuccess: SuccessHandler = (event) => this.handleSuccess(event.source, event.label);
        this.detectors = registerFailureDetectors(() => this.config, onFailure, onSuccess, this.logger);
    }

    private async handleFailure(source: FailureSource, label: string): Promise<void> {
        if (!this.config.enabled) { return; }
        if (this.scheduler.isMuted(source)) {
            this.logger.debug(`Failure muted by scheduler: ${label}`);
            return;
        }
        if (this.config.ignorePatterns.some((re) => re.test(label))) {
            this.logger.debug(`Failure ignored by pattern: ${label}`);
            return;
        }

        this.scheduler.record(source);
        this.statusBar.incrementCounter();
        this.statusBar.flash();

        this.logger.info(`Failure: [${source}] ${label}`);

        // AI Summary
        let extraMsg = '';
        if (this.config.aiSummaryEnabled) {
            const summary = await this.integrations.getAiSummary(label);
            if (summary) { extraMsg = ` — ${summary}`; }
        }

        // Notification
        if (this.config.showNotification && this.config.notificationLevel !== 'none') {
            const msg = `${label}${extraMsg}`;
            switch (this.config.notificationLevel) {
                case 'info': void vscode.window.showInformationMessage(msg); break;
                case 'warning': void vscode.window.showWarningMessage(msg); break;
                case 'error': void vscode.window.showErrorMessage(msg); break;
            }
        }

        // Sound
        const soundPath = this.soundResolver.resolveForFailure(source, false);
        if (soundPath) {
            const volume = this.applyVolumeCurve(this.soundResolver.getVolume(source));
            this.player.play(soundPath, { volume });
        }

        // Voice
        this.integrations.speak(`${source} failed: ${label}`);

        // Webhook
        this.integrations.postWebhook(label, source);

        // Boss fight
        const bossMsg = this.integrations.recordFailure();
        if (bossMsg) {
            void vscode.window.showInformationMessage(bossMsg);
        }

        // History
        const entry: HistoryEntry = {
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            source,
            label,
            soundPath: soundPath ?? ''
        };
        this.history.add(entry);
    }

    private handleSuccess(source: FailureSource, label: string): void {
        if (!this.config.successEnabled) { return; }
        this.logger.debug(`Success: [${source}] ${label}`);

        const soundPath = this.soundResolver.resolveForFailure(source, true);
        if (soundPath) {
            const volume = this.applyVolumeCurve(this.soundResolver.getVolume(source));
            this.player.play(soundPath, { volume });
        }

        const streakMsg = this.integrations.recordSuccess();
        if (streakMsg) {
            void vscode.window.showInformationMessage(streakMsg);
        }
    }

    private applyVolumeCurve(volume: number): number {
        if (this.config.volumeCurve === 'log') {
            // Logarithmic curve: perceptually more natural
            if (volume <= 0) { return 0; }
            const normalized = volume / 100;
            const logVal = Math.log10(1 + normalized * 9) / Math.log10(10);
            return Math.round(logVal * 100);
        }
        return volume;
    }

    private registerHistoryView(): void {
        this.historyView = vscode.window.createTreeView('fahh.history', { treeDataProvider: this.history });
    }

    private registerCommands(): void {
        const cmds = [
            vscode.commands.registerCommand('fahh.test', () => {
                const soundPath = this.soundResolver.resolveForFailure('task', false);
                if (soundPath) {
                    this.player.play(soundPath, { volume: this.config.volume });
                }
            }),
            vscode.commands.registerCommand('fahh.testSuccess', () => {
                const soundPath = this.soundResolver.resolveForFailure('task', true);
                if (soundPath) {
                    this.player.play(soundPath, { volume: this.config.volume });
                }
            }),
            vscode.commands.registerCommand('fahh.toggle', async () => {
                const next = !this.config.enabled;
                await updateEnabled(next);
                void vscode.window.showInformationMessage(`Fahh ${next ? 'enabled' : 'disabled'}.`);
                this.statusBar.refresh();
            }),
            vscode.commands.registerCommand('fahh.toggleWorkspace', async () => {
                const next = !this.config.enabled;
                await updateEnabled(next, vscode.ConfigurationTarget.Workspace);
                void vscode.window.showInformationMessage(`Fahh ${next ? 'enabled' : 'disabled'} for this workspace.`);
                this.statusBar.refresh();
            }),
            vscode.commands.registerCommand('fahh.selectSound', async () => {
                const picked = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    openLabel: 'Use this sound',
                    filters: { Audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a'] }
                });
                if (!picked || picked.length === 0) { return; }
                await updateSoundPath(picked[0].fsPath);
                void vscode.window.showInformationMessage('Fahh sound updated.');
            }),
            vscode.commands.registerCommand('fahh.selectSoundFolder', async () => {
                const picked = await vscode.window.showOpenDialog({
                    canSelectFiles: false,
                    canSelectFolders: true,
                    canSelectMany: false,
                    openLabel: 'Select folder'
                });
                if (!picked || picked.length === 0) { return; }
                await updateSoundFolder(picked[0].fsPath);
                void vscode.window.showInformationMessage('Fahh sound folder set. Sounds will be random from this folder.');
            }),
            vscode.commands.registerCommand('fahh.resetSound', async () => {
                await updateSoundPath('');
                void vscode.window.showInformationMessage('Fahh sound reset to default.');
            }),
            vscode.commands.registerCommand('fahh.pickSoundPack', async () => {
                const packs = this.soundResolver.listSoundPacks();
                if (packs.length === 0) {
                    void vscode.window.showWarningMessage('No sound packs installed. Use custom sound instead.');
                    return;
                }
                const items = packs.map(p => ({ label: p.name, description: p.id }));
                const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Select a sound pack' });
                if (!picked) { return; }
                const packPath = this.soundResolver.pickFromPack(picked.description);
                if (packPath) {
                    await updateSoundPath(packPath);
                    void vscode.window.showInformationMessage(`Sound pack "${picked.label}" selected.`);
                }
            }),
            vscode.commands.registerCommand('fahh.stop', () => {
                this.player.stop();
            }),
            vscode.commands.registerCommand('fahh.snooze', () => {
                this.scheduler.snooze(this.config.snoozeMinutes);
                void vscode.window.showInformationMessage(`Fahh snoozed for ${this.config.snoozeMinutes} minutes.`);
            }),
            vscode.commands.registerCommand('fahh.clearHistory', () => {
                this.history.clear();
                void vscode.window.showInformationMessage('Failure history cleared.');
            }),
            vscode.commands.registerCommand('fahh.replayLast', () => {
                const last = this.history.getLast();
                if (last && last.soundPath && fs.existsSync(last.soundPath)) {
                    this.player.play(last.soundPath, { volume: this.config.volume });
                } else {
                    void vscode.window.showWarningMessage('No recent failure to replay.');
                }
            }),
            vscode.commands.registerCommand('fahh.showHistory', () => {
                vscode.commands.executeCommand('fahh.history.focus');
            }),
            vscode.commands.registerCommand('fahh.showOutput', () => {
                this.logger.show();
            }),
            vscode.commands.registerCommand('fahh.resetSettings', async () => {
                const confirm = await vscode.window.showWarningMessage(
                    'Are you sure you want to reset all Fahh settings to default?',
                    { modal: true },
                    'Reset'
                );
                if (confirm === 'Reset') {
                    await resetAllSettings();
                    this.config = readConfig();
                    this.statusBar.refresh();
                    void vscode.window.showInformationMessage('Fahh settings have been reset.');
                }
            }),
            vscode.commands.registerCommand('fahh.factoryReset', async () => {
                const confirm = await vscode.window.showWarningMessage(
                    'This will reset all settings AND clear your failure history. Proceed?',
                    { modal: true },
                    'Factory Reset'
                );
                if (confirm === 'Factory Reset') {
                    await resetAllSettings();
                    this.history.clear();
                    this.statusBar.resetCounter();
                    try {
                        await this.ctx.globalState.update('lastVersion', undefined);
                    } catch (err) {
                        this.logger.warn(`Failed to clear lastVersion: ${err instanceof Error ? err.message : String(err)}`);
                    }
                    this.config = readConfig();
                    this.statusBar.refresh();
                    void vscode.window.showInformationMessage('Fahh has been factory reset.');
                }
            }),
            vscode.commands.registerCommand('fahh.showWelcome', () => {
                WelcomePanel.createOrShow(this.ctx.extensionUri);
            })
        ];
        this.ctx.subscriptions.push(...cmds);
    }
}

export function activate(ctx: vscode.ExtensionContext): void {
    const extension = new FahhExtension(ctx);
    extension.start();
}

export function deactivate(): void {
    // Disposables auto-cleaned by VS Code
}

function shouldShowWelcome(lastVersion: string | undefined, currentVersion: string): boolean {
    if (!lastVersion) {
        // First install
        return true;
    }
    return semverMajor(lastVersion) !== semverMajor(currentVersion);
}

function semverMajor(version: string): number {
    const major = Number(version.split('.')[0]);
    return Number.isFinite(major) ? major : 0;
}
