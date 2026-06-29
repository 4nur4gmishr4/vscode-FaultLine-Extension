/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as vscode from 'vscode';
import { FaultLineRuntime } from './application/runtime/faultline';
import { registerCommands } from './presentation/commands/index';
import { WelcomePanel } from './presentation/ui/welcome';
import { setLanguage } from './shared/utils/i18n';

let runtime: FaultLineRuntime | null = null;

/**
 * Activates the FaultLine extension.
 */
export function activate(ctx: vscode.ExtensionContext): void {
    runtime = new FaultLineRuntime(ctx);
    
    const version = (ctx.extension.packageJSON?.version as string | undefined) ?? 'unknown';
    runtime.logger.info(`FaultLine v${version} activating on ${process.platform} (VS Code ${vscode.version}).`);

    runtime.activate();
    registerCommands(runtime, ctx.extensionUri, ctx.subscriptions);

    // Initial setup
    const config = runtime.configManager.readConfig();
    setLanguage(config.core.language);

    // Lifecycle events
    ctx.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (runtime?.configManager.affectsFaultLine(event)) {
                const newConfig = runtime.configManager.readConfig();
                runtime.logger.setLevel(newConfig.core.logLevel);
                setLanguage(newConfig.core.language);
                runtime.statusBar.refresh();
                runtime.registerDetectors();
                runtime.logger.debug('Configuration reloaded.');
            }
        }),
        runtime
    );

    void maybeShowWelcomeOnInstall(ctx, runtime);
}

/**
 * Deactivates the FaultLine extension.
 */
export function deactivate(): void {
    if (runtime) {
        runtime.dispose();
        runtime = null;
    }
}

async function maybeShowWelcomeOnInstall(ctx: vscode.ExtensionContext, rt: FaultLineRuntime): Promise<void> {
    const version = ctx.extension.packageJSON.version as string;
    const lastVersion = rt.stateStore.getLastVersion();
    
    if (shouldShowWelcome(lastVersion, version)) {
        WelcomePanel.createOrShow(ctx.extensionUri);
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
