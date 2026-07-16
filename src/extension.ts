import * as vscode from 'vscode';
import { FaultLineRuntime } from './application/runtime/faultline';
import { registerCommands } from './presentation/commands/index';
import { WelcomePanel } from './presentation/ui/welcome';
import { setLanguage } from './shared/utils/i18n';

let runtime: FaultLineRuntime | null = null;

/**
 * Activates the FaultLine extension.
 * Commands are registered as early as possible so a detector/API failure cannot
 * leave the palette with dead "command not found" entries.
 */
export function activate(ctx: vscode.ExtensionContext): void {
    try {
        runtime = new FaultLineRuntime(ctx);

        const version =
            ((ctx.extension.packageJSON as { version?: string })?.version) ?? 'unknown';
        runtime.logger.info(
            `FaultLine v${version} activating on ${process.platform} (VS Code ${vscode.version}).`
        );

        // Register commands BEFORE detectors so UI commands always work.
        registerCommands(runtime, ctx.extensionUri, ctx.subscriptions);

        try {
            const config = runtime.configManager.readConfig();
            setLanguage(config.core.language);
            runtime.logger.setLevel(config.core.logLevel);
        } catch (err) {
            runtime.logger.error('Failed to load initial config', err);
        }

        runtime.activate();

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

        void maybeShowWelcomeOnInstall(ctx, runtime).catch((err: unknown) => {
            runtime?.logger.error('Welcome / migration failed', err);
        });
    } catch (err) {
        // Last-resort: surface activation failure so users are not stuck with silent commands.
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[FaultLine] activation failed:', err);
        void vscode.window.showErrorMessage(
            `FaultLine failed to activate: ${msg}. Open "FaultLine: Show Output Log" after reloading if available.`
        );
        throw err;
    }
}

/**
 * Deactivates the FaultLine extension.
 * Runtime is also registered on `ctx.subscriptions`; dispose is idempotent.
 */
export function deactivate(): void {
    if (runtime) {
        runtime.dispose();
        runtime = null;
    }
}

async function maybeShowWelcomeOnInstall(ctx: vscode.ExtensionContext, rt: FaultLineRuntime): Promise<void> {
    const version = (ctx.extension.packageJSON as { version: string }).version;
    const lastVersion = rt.stateStore.getLastVersion();
    
    if (shouldShowWelcome(lastVersion, version)) {
        // First install (or major jump): typing greeting, then welcome UI
        WelcomePanel.createOrShow(ctx.extensionUri, true);
    }
    
    // Migration logic moved to Runtime or kept here for lifecycle
    await migrateApiKeys(ctx, rt, lastVersion);
    
    if (lastVersion !== version) {
        await rt.stateStore.updateLastVersion(version);
    }
}

async function migrateApiKeys(_ctx: vscode.ExtensionContext, rt: FaultLineRuntime, lastVersion: string | undefined): Promise<void> {
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
    if (!lastVersion) return true;
    const v1 = Number(lastVersion.split('.')[0]);
    const v2 = Number(currentVersion.split('.')[0]);
    return v1 !== v2;
}
