import * as vscode from 'vscode';
import { FaultLineRuntime } from './application/runtime/faultline';
import { registerCommands } from './presentation/commands/index';
import { WelcomePanel } from './presentation/ui/welcome';
import { setLanguage } from './shared/utils/i18n';

let runtime: FaultLineRuntime | null = null;

/**
 * Activates the FaultLine extension.
 *
 * Commands are registered as early as possible. We never rethrow after a
 * successful command registration — a thrown activate() makes VS Code treat
 * the extension as failed and leaves palette entries as "command not found".
 */
export function activate(ctx: vscode.ExtensionContext): void {
    let commandsRegistered = false;

    try {
        runtime = new FaultLineRuntime(ctx);

        const version =
            ((ctx.extension.packageJSON as { version?: string })?.version) ?? 'unknown';
        runtime.logger.info(
            `FaultLine v${version} activating on ${process.platform} (VS Code ${vscode.version}).`
        );

        // Register commands BEFORE detectors / welcome so UI always works.
        registerCommands(runtime, ctx.extensionUri, ctx.subscriptions);
        commandsRegistered = true;
        runtime.logger.info('FaultLine commands registered.');

        try {
            const config = runtime.configManager.readConfig();
            setLanguage(config.core.language);
            runtime.logger.setLevel(config.core.logLevel);
        } catch (err) {
            runtime.logger.error('Failed to load initial config', err);
        }

        try {
            runtime.activate();
        } catch (err) {
            runtime.logger.error('Runtime activate failed (commands still available)', err);
        }

        try {
            ctx.subscriptions.push(
                vscode.workspace.onDidChangeConfiguration((event) => {
                    if (!runtime?.configManager.affectsFaultLine(event)) {
                        return;
                    }
                    try {
                        const newConfig = runtime.configManager.readConfig();
                        runtime.logger.setLevel(newConfig.core.logLevel);
                        setLanguage(newConfig.core.language);
                        runtime.statusBar.refresh();
                        if (runtime.configManager.affectsDetectors(event)) {
                            runtime.registerDetectors();
                        }
                        runtime.logger.debug('Configuration reloaded.');
                    } catch (err) {
                        runtime?.logger.error('Failed to reload configuration', err);
                    }
                }),
                runtime
            );
        } catch (err) {
            runtime.logger.error('Failed to attach config watcher', err);
        }

        void maybeShowWelcomeOnInstall(ctx, runtime).catch((err: unknown) => {
            runtime?.logger.error('Welcome / migration failed', err);
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[FaultLine] activation failed:', err);

        if (!commandsRegistered) {
            registerEmergencyCommands(ctx, msg);
        }

        void vscode.window.showErrorMessage(
            `FaultLine failed to activate fully: ${msg}. Try "FaultLine: Show Output Log" or reload the window.`
        );
        // Do NOT rethrow: rethrowing marks the extension as failed and kills commands.
    }
}

/**
 * Minimal handlers so the user can still open the log / get a clear error
 * if full runtime construction failed before command registration.
 */
function registerEmergencyCommands(ctx: vscode.ExtensionContext, reason: string): void {
    const ids = [
        'faultline.showOutput',
        'faultline.toggle',
        'faultline.toggleSounds',
        'faultline.openSettings',
        'faultline.showWelcome',
        'faultline.explainError',
        'faultline.test',
        'faultline.testSuccess',
        'faultline.factoryReset',
        'faultline.resetSettings',
        'faultline.snooze',
        'faultline.stop',
        'faultline.selectSound',
        'faultline.selectSoundFolder',
        'faultline.resetSound',
        'faultline.pickSoundPack',
        'faultline.toggleWorkspace',
        'faultline.testSound'
    ];

    for (const id of ids) {
        try {
            ctx.subscriptions.push(
                vscode.commands.registerCommand(id, () => {
                    void vscode.window.showErrorMessage(
                        `FaultLine is not fully loaded (${reason}). Reload the window (Developer: Reload Window).`
                    );
                })
            );
        } catch {
            // Already registered or unavailable — ignore.
        }
    }
}

/**
 * Deactivates the FaultLine extension.
 * Runtime is also registered on `ctx.subscriptions`; dispose is idempotent.
 */
export function deactivate(): void {
    if (runtime) {
        try {
            runtime.dispose();
        } catch (err) {
            console.error('[FaultLine] dispose failed:', err);
        }
        runtime = null;
    }
}

async function maybeShowWelcomeOnInstall(
    ctx: vscode.ExtensionContext,
    rt: FaultLineRuntime
): Promise<void> {
    const version = (ctx.extension.packageJSON as { version: string }).version;
    const lastVersion = rt.stateStore.getLastVersion();

    if (shouldShowWelcome(lastVersion, version)) {
        try {
            WelcomePanel.createOrShow(ctx.extensionUri, true);
        } catch (err) {
            rt.logger.error('Welcome panel failed on install', err);
        }
    }

    await migrateApiKeys(ctx, rt, lastVersion);

    if (lastVersion !== version) {
        try {
            await rt.stateStore.updateLastVersion(version);
        } catch (err) {
            rt.logger.error('Failed to persist lastVersion', err);
        }
    }
}

async function migrateApiKeys(
    _ctx: vscode.ExtensionContext,
    rt: FaultLineRuntime,
    lastVersion: string | undefined
): Promise<void> {
    if (!lastVersion || rt.stateStore.isMigrationCompleted()) {
        return;
    }

    rt.logger.info('Starting API key migration...');
    const cfg = vscode.workspace.getConfiguration('faultline');

    const keysToMigrate = [
        { setting: 'openrouterApiKey', provider: 'openrouter' },
        { setting: 'jiraApiKey', provider: 'jira' },
        { setting: 'teamSyncApiKey', provider: 'teamsync' },
        { setting: 'githubToken', provider: 'github' },
        { setting: 'pagerDutyApiKey', provider: 'pagerduty' },
        { setting: 'sentryDsn', provider: 'sentry' },
        { setting: 'projectManagementApiKey', provider: 'projectmanagement' }
    ];

    for (const { setting, provider } of keysToMigrate) {
        const plaintextKey = cfg.get<string>(setting, '').trim();
        if (plaintextKey) {
            try {
                await rt.secretManager.storeApiKey(provider, plaintextKey);
                await cfg.update(setting, undefined, vscode.ConfigurationTarget.Global);
                await cfg.update(setting, undefined, vscode.ConfigurationTarget.Workspace);
            } catch (err) {
                rt.logger.error(`Failed to migrate ${setting}`, err);
            }
        }
    }

    await rt.stateStore.setMigrationCompleted(true);
}

function shouldShowWelcome(lastVersion: string | undefined, currentVersion: string): boolean {
    if (!lastVersion) {
        return true;
    }
    const v1 = Number(lastVersion.split('.')[0]);
    const v2 = Number(currentVersion.split('.')[0]);
    return v1 !== v2;
}
