import * as vscode from 'vscode';
import { FaultLineRuntime } from '../../../application/runtime/faultline';
import type { FailureEvent } from '../../../domain/types/index';
import * as git from '../../../shared/utils/git';

function mockContext() {
    const mem = new Map<string, unknown>();
    return {
        secrets: {
            get: jest.fn(async () => undefined),
            store: jest.fn(async () => undefined),
            delete: jest.fn(async () => undefined)
        },
        globalState: {
            get: jest.fn((k: string, d?: unknown) => (mem.has(k) ? mem.get(k) : d)),
            update: jest.fn(async (k: string, v: unknown) => {
                if (v === undefined) {
                    mem.delete(k);
                } else {
                    mem.set(k, v);
                }
            })
        },
        extensionPath: '/fake/extension',
        extensionUri: vscode.Uri.file('/fake/extension'),
        extension: { packageJSON: { version: '3.1.1' } },
        subscriptions: [] as { dispose: () => void }[]
    };
}

describe('FaultLineRuntime.handleFailure', () => {
    let rt: FaultLineRuntime;
    let handleFailure: (e: FailureEvent) => Promise<void>;

    beforeEach(() => {
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((_k: string, def?: unknown) => def),
            update: jest.fn(),
            inspect: jest.fn()
        });

        rt = new FaultLineRuntime(mockContext() as never);
        handleFailure = (rt as unknown as { handleFailure: (e: FailureEvent) => Promise<void> })
            .handleFailure.bind(rt) as (e: FailureEvent) => Promise<void>;

        jest.spyOn(rt.resolver, 'resolveForFailure').mockResolvedValue('/tmp/sound.mp3');
        jest.spyOn(rt.player, 'play').mockResolvedValue(undefined);
        jest.spyOn(rt.webhook, 'postWebhook').mockImplementation(() => undefined);
        jest.spyOn(rt.webhook, 'postToJira').mockResolvedValue(false);
        jest.spyOn(rt.ai, 'getAiSummary').mockResolvedValue(null);
        jest.spyOn(rt.errorExplanation, 'showFailureExplanation').mockImplementation(() => undefined);
        jest.spyOn(rt.history, 'add');
        jest.spyOn(rt.statusBar, 'refresh');
        jest.spyOn(rt.statusBar, 'flash');
    });

    afterEach(() => {
        rt.dispose();
        jest.restoreAllMocks();
    });

    const baseEvent = (): FailureEvent => ({
        source: 'task',
        label: 'npm run build',
        timestamp: Date.now()
    });

    it('is muted by snooze (no history, no sound)', async () => {
        rt.scheduler.snooze(30);
        await handleFailure(baseEvent());
        expect(rt.history.add).not.toHaveBeenCalled();
        expect(rt.player.play).not.toHaveBeenCalled();
    });

    it('ignores patterns on label', async () => {
        const cfg = rt.configManager.readConfig();
        jest.spyOn(rt.configManager, 'readConfig').mockReturnValue({
            ...cfg,
            detection: {
                ...cfg.detection,
                ignorePatterns: [/npm run build/]
            }
        });
        await handleFailure(baseEvent());
        expect(rt.history.add).not.toHaveBeenCalled();
    });

    it('increments daily fail count and refreshes status bar', async () => {
        await handleFailure(baseEvent());
        expect(rt.stateStore.getDailyFailCount()).toBe(1);
        expect(rt.statusBar.refresh).toHaveBeenCalled();
        expect(rt.history.add).toHaveBeenCalled();
    });

    it('stores sanitized output on history entries', async () => {
        await handleFailure({
            ...baseEvent(),
            output: 'Error: contact me@example.com for help'
        });
        expect(rt.history.add).toHaveBeenCalledWith(
            expect.objectContaining({
                label: 'npm run build',
                output: expect.stringContaining('[EMAIL]')
            })
        );
    });

    it('does not auto-show AI explanation by default', async () => {
        await handleFailure(baseEvent());
        expect(rt.errorExplanation.showFailureExplanation).not.toHaveBeenCalled();
    });

    it('fails closed when branch patterns set but git branch is unknown', async () => {
        const branchSpy = jest.spyOn(git, 'getCurrentGitBranch').mockResolvedValue(null);
        const cfg = rt.configManager.readConfig();
        jest.spyOn(rt.configManager, 'readConfig').mockReturnValue({
            ...cfg,
            detection: {
                ...cfg.detection,
                branchPatterns: ['main']
            }
        });
        await handleFailure(baseEvent());
        expect(rt.history.add).not.toHaveBeenCalled();
        branchSpy.mockRestore();
    });

    it('allows failure when branch matches pattern', async () => {
        const branchSpy = jest.spyOn(git, 'getCurrentGitBranch').mockResolvedValue('main');
        const cfg = rt.configManager.readConfig();
        jest.spyOn(rt.configManager, 'readConfig').mockReturnValue({
            ...cfg,
            detection: {
                ...cfg.detection,
                branchPatterns: ['main']
            }
        });
        await handleFailure(baseEvent());
        expect(rt.history.add).toHaveBeenCalled();
        branchSpy.mockRestore();
    });

    it('rate-limits sound via cooldown but still records history', async () => {
        const cfg = rt.configManager.readConfig();
        jest.spyOn(rt.configManager, 'readConfig').mockReturnValue({
            ...cfg,
            detection: {
                ...cfg.detection,
                cooldownMs: 60_000,
                cooldownPerSource: false,
                maxPerMinute: 0
            },
            audio: { ...cfg.audio, soundsEnabled: true }
        });

        await handleFailure(baseEvent());
        await handleFailure({ ...baseEvent(), label: 'other fail' });

        expect(rt.player.play).toHaveBeenCalledTimes(1);
        expect(rt.history.add).toHaveBeenCalledTimes(2);
    });

    it('shows notification at configured level', async () => {
        const cfg = rt.configManager.readConfig();
        jest.spyOn(rt.configManager, 'readConfig').mockReturnValue({
            ...cfg,
            ui: { ...cfg.ui, showNotification: true, notificationLevel: 'warning' }
        });
        await handleFailure(baseEvent());
        expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });

    it('skips notification when level is none', async () => {
        const cfg = rt.configManager.readConfig();
        jest.spyOn(rt.configManager, 'readConfig').mockReturnValue({
            ...cfg,
            ui: { ...cfg.ui, showNotification: true, notificationLevel: 'none' }
        });
        (vscode.window.showErrorMessage as jest.Mock).mockClear();
        (vscode.window.showWarningMessage as jest.Mock).mockClear();
        (vscode.window.showInformationMessage as jest.Mock).mockClear();
        await handleFailure(baseEvent());
        expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
        expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });
});
