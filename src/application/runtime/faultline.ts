import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../../shared/utils/logger';
import { ConfigManager } from '../../shared/config/configManager';
import { SecretManager } from '../../shared/config/secretManager';
import { StateStore } from '../../infrastructure/state/stateStore';
import { Scheduler } from '../../shared/utils/scheduler';
import { AudioPlayer } from '../core/audioPlayer';
import { SoundResolver } from '../core/soundResolver';
import { StatusBarManager } from '../../presentation/ui/statusBar';
import { HistoryManager } from '../../shared/utils/history';
import { AIService, WebhookService } from '../../infrastructure/services/index';
import { TaskDetector, TerminalDetector, DiagnosticDetector } from '../../infrastructure/detectors/index';
import { FailureEvent, FailureSource, NotificationLevel } from '../../domain/types/index';
import { sanitizePII } from '../../infrastructure/security/pii';
import { ErrorExplanationManager } from '../../presentation/ui/errorExplanation';
import { VALIDATION } from '../../shared/config/constants';
import { getCurrentGitBranch, matchesBranchPattern } from '../../shared/utils/git';

/**
 * Global application context for the extension.
 * Manages the lifecycle of all services and detectors.
 */
export class FaultLineRuntime {
    public readonly logger: Logger;
    public readonly configManager: ConfigManager;
    public readonly secretManager: SecretManager;
    public readonly stateStore: StateStore;
    public readonly scheduler: Scheduler;
    public readonly player: AudioPlayer;
    public readonly resolver: SoundResolver;
    public readonly statusBar: StatusBarManager;
    public readonly history: HistoryManager;
    public readonly errorExplanation: ErrorExplanationManager;

    public readonly ai: AIService;
    public readonly webhook: WebhookService;

    /** Extension install path (public so commands need not reach into private ctx). */
    public readonly extensionPath: string;

    private detectors: vscode.Disposable | null = null;
    private disposed = false;

    constructor(private readonly ctx: vscode.ExtensionContext) {
        this.extensionPath = ctx.extensionPath;
        this.logger = new Logger('FaultLine');
        this.secretManager = new SecretManager(ctx.secrets);
        this.configManager = new ConfigManager(ctx.secrets, this.logger);
        this.stateStore = new StateStore(ctx.globalState);

        const configFn = () => this.configManager.readConfig();
        
        this.scheduler = new Scheduler(configFn, this.logger);
        this.player = new AudioPlayer(this.logger);
        this.resolver = new SoundResolver(this.ctx.extensionPath, configFn, this.logger);
        this.statusBar = new StatusBarManager(
            configFn,
            this.logger,
            () => this.stateStore.getDailyFailCount()
        );
        this.history = new HistoryManager(configFn, this.logger, ctx.globalState);

        this.ai = new AIService(this.configManager, this.secretManager, this.logger);
        this.webhook = new WebhookService(this.configManager, this.secretManager, this.logger);
        this.errorExplanation = new ErrorExplanationManager(this.logger, this.ai, this.ctx.extensionUri);

        this.logger.setLevel(configFn().core.logLevel);
    }

    public activate(): void {
        // Fire-and-forget: temp cleanup must never block extension activation on slow I/O.
        void this.cleanOrphanedTempFiles();
        this.registerDetectors();
        this.statusBar.refresh();
    }

    private async cleanOrphanedTempFiles(): Promise<void> {
        try {
            const tmpDir = os.tmpdir();
            const files = await fs.promises.readdir(tmpDir);
            let cleaned = 0;
            for (const file of files) {
                if (file.startsWith('faultline_play_') && file.endsWith('.vbs')) {
                    try {
                        await fs.promises.unlink(path.join(tmpDir, file));
                        cleaned++;
                    } catch {
                        // File may have been removed by another instance; ignore.
                    }
                }
            }
            if (cleaned > 0) {
                this.logger.debug(`Cleaned up ${cleaned} orphaned VBScript files`);
            }
        } catch (e) {
            this.logger.error('Failed to clean orphaned temp files', e);
        }
    }

    public registerDetectors(): void {
        if (this.detectors) {
            this.detectors.dispose();
        }

        const disposables: vscode.Disposable[] = [];
        const configFn = () => this.configManager.readConfig();
        
        const onFailure = (e: FailureEvent) => { void this.handleFailure(e); };
        const onSuccess = (e: { source: FailureSource; label: string; executionTime?: number }) => {
            void this.handleSuccess(e.source, e.label, e.executionTime);
        };

        new TaskDetector(configFn, this.logger, onFailure, onSuccess).register(disposables);
        new TerminalDetector(configFn, this.logger, onFailure).register(disposables);
        new DiagnosticDetector(configFn, onFailure).register(disposables);

        this.detectors = vscode.Disposable.from(...disposables);
    }

    private async handleFailure(event: FailureEvent): Promise<void> {
        const { source, label } = event;
        if (this.scheduler.isMuted(source)) {
            return;
        }

        const sanitizedLabel = sanitizePII(label);
        const sanitizedOutput =
            event.output !== undefined && event.output.length > 0
                ? sanitizePII(event.output)
                : event.output;
        const sanitizedEvent: FailureEvent = {
            ...event,
            label: sanitizedLabel,
            output: sanitizedOutput
        };
        const config = this.configManager.readConfig();

        // ignorePatterns: skip event entirely if label/output matches
        if (this.isIgnored(sanitizedLabel, sanitizedOutput, config.detection.ignorePatterns)) {
            this.logger.debug(`Ignored by pattern: [${source}] ${sanitizedLabel}`);
            return;
        }

        // Branch filter applies to all sources; fail closed when branch is unknown.
        if (config.detection.branchPatterns.length > 0) {
            const branch = await getCurrentGitBranch();
            if (!branch || !matchesBranchPattern(branch, config.detection.branchPatterns)) {
                this.logger.debug(
                    branch
                        ? `Ignored by branch filter (${branch}): [${source}] ${sanitizedLabel}`
                        : `Ignored: branch patterns set but current branch unavailable ([${source}])`
                );
                return;
            }
        }

        this.logger.info(`Failure: [${source}] ${sanitizedLabel}`);

        try {
            const soundPath = await this.resolver.resolveForFailure(source);
            const volume = this.resolver.getVolume(source);

            const allowSound =
                config.audio.soundsEnabled &&
                !this.scheduler.isSoundRateLimited(source);

            if (soundPath && allowSound) {
                void this.player.play(soundPath, { volume }).catch(err => {
                    this.logger.debug(`Playback failed: ${err instanceof Error ? err.message : String(err)}`);
                });
                this.scheduler.record(source);
            }
            
            // Async services (fire and forget) — never log model text at info (privacy)
            if (config.ai.summaryEnabled) {
                void this.ai.getAiSummary(sanitizedLabel).then(summary => {
                    if (summary) this.logger.debug(`AI summary received (${summary.length} chars)`);
                }).catch(err => {
                    this.logger.debug(`AI summary failed: ${err instanceof Error ? err.message : String(err)}`);
                });
            }

            void this.webhook.postWebhook(sanitizedLabel, source);
            void this.webhook.postToJira(sanitizedLabel, source);

            const historyOutput =
                sanitizedOutput !== undefined && sanitizedOutput.length > 0
                    ? sanitizedOutput.slice(0, VALIDATION.AI_PAYLOAD.OUTPUT)
                    : undefined;

            this.history.add({
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                source,
                label: sanitizedLabel,
                output: historyOutput,
                soundPath: soundPath ?? '',
                executionTime: event.executionTime
            });

            await this.stateStore.incrementDailyFailCount();
            this.statusBar.refresh();
            if (config.ui.flashStatusBar) {
                this.statusBar.flash();
            }

            if (config.ai.errorExplanationEnabled && config.ai.errorExplanationAutoShow) {
                void this.errorExplanation.showFailureExplanation(sanitizedEvent);
            }

            if (config.ui.showNotification) {
                const message = `FaultLine: [${source}] ${sanitizedLabel}`;
                const buttons = ['Configure', 'Explain Error'];
                void this.notifyByLevel(config.ui.notificationLevel, message, buttons).then(selection => {
                    if (selection === 'Explain Error') {
                        void this.errorExplanation.showFailureExplanation(sanitizedEvent);
                    } else if (selection === 'Configure') {
                        void vscode.commands.executeCommand('faultline.openSettings');
                    }
                });
            }
        } catch (err) {
            this.logger.error('Failed to handle failure', err);
        }
    }

    private isIgnored(label: string, output: string | undefined, patterns: RegExp[]): boolean {
        if (patterns.length === 0) {
            return false;
        }
        const haystack = output ? `${label}\n${output}` : label;
        return patterns.some((re) => {
            re.lastIndex = 0;
            return re.test(haystack);
        });
    }

    private notifyByLevel(
        level: NotificationLevel,
        message: string,
        items: string[]
    ): Thenable<string | undefined> {
        switch (level) {
            case 'none':
                return Promise.resolve(undefined);
            case 'info':
                return vscode.window.showInformationMessage(message, ...items);
            case 'warning':
                return vscode.window.showWarningMessage(message, ...items);
            case 'error':
            default:
                return vscode.window.showErrorMessage(message, ...items);
        }
    }

    private async handleSuccess(source: FailureSource, _label: string, _executionTime?: number): Promise<void> {
        // Same full-event mute as failures: disabled, snooze, quiet hours, mute-when-focused.
        if (this.scheduler.isMuted(source)) {
            return;
        }

        const config = this.configManager.readConfig();
        if (!config.audio.successEnabled) return;

        try {
            const soundPath = await this.resolver.resolveForFailure(source, true);
            const volume = this.resolver.getVolume(source);

            if (soundPath && config.audio.soundsEnabled && !this.scheduler.isSoundRateLimited(source)) {
                void this.player.play(soundPath, { volume });
                this.scheduler.record(source);
            }

            this.statusBar.refresh();
        } catch (err) {
            this.logger.error('Failed to handle success', err);
        }
    }

    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.detectors?.dispose();
        this.detectors = null;
        this.player.dispose();
        this.statusBar.dispose();
        this.scheduler.dispose();
        this.webhook.dispose();
        this.errorExplanation.dispose();
        this.logger.dispose();
    }
}
