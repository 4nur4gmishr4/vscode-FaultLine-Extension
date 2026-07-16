import * as vscode from 'vscode';
import { FaultLineRuntime } from '../../application/runtime/faultline';
import { registerStateCommands } from '../../presentation/commands/stateCommands';

function mockContext() {
    const mem = new Map<string, unknown>();
    const secrets = new Map<string, string>();
    return {
        secrets: {
            get: jest.fn(async (k: string) => secrets.get(k)),
            store: jest.fn(async (k: string, v: string) => {
                secrets.set(k, v);
            }),
            delete: jest.fn(async (k: string) => {
                secrets.delete(k);
            })
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
        extension: { packageJSON: { version: '3.5.0' } },
        subscriptions: [] as { dispose: () => void }[],
        _secrets: secrets,
        _mem: mem
    };
}

describe('faultline.factoryReset', () => {
    let rt: FaultLineRuntime;
    let ctx: ReturnType<typeof mockContext>;
    let factoryHandler: (() => Promise<void>) | undefined;

    beforeEach(() => {
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((_k: string, def?: unknown) => def),
            update: jest.fn(async () => undefined),
            inspect: jest.fn(() => ({
                globalValue: { volume: 40 },
                workspaceValue: {},
                workspaceFolderValue: {}
            }))
        });

        (vscode.commands.registerCommand as jest.Mock).mockImplementation(
            (id: string, fn: () => Promise<void>) => {
                if (id === 'faultline.factoryReset') {
                    factoryHandler = fn;
                }
                return { dispose: jest.fn() };
            }
        );

        (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Factory Reset');

        ctx = mockContext();
        rt = new FaultLineRuntime(ctx as never);
        const disposables: vscode.Disposable[] = [];
        registerStateCommands(rt, disposables);
    });

    afterEach(() => {
        rt.dispose();
        jest.restoreAllMocks();
        factoryHandler = undefined;
    });

    it('clears history, state, secrets, and resets settings when confirmed', async () => {
        await rt.secretManager.storeApiKey('openrouter', 'sk-or-v1-abcdefghijklmnopqrstuvwxyz');
        await rt.secretManager.storeApiKey('jira', 'ATATT3xFfGF0-jira-token-value-xyz');
        rt.history.add({
            id: '1',
            timestamp: Date.now(),
            source: 'task',
            label: 'fail',
            soundPath: ''
        });
        await rt.stateStore.incrementDailyFailCount();
        rt.scheduler.snooze(15);

        expect(factoryHandler).toBeDefined();
        await factoryHandler!();

        expect(rt.history.getAll()).toHaveLength(0);
        expect(rt.stateStore.getDailyFailCount()).toBe(0);
        expect(await rt.secretManager.getApiKey('openrouter')).toBeNull();
        expect(await rt.secretManager.getApiKey('jira')).toBeNull();
        expect(vscode.workspace.getConfiguration('faultline').update).toHaveBeenCalled();
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
            expect.stringMatching(/factory reset/i)
        );
    });

    it('does nothing when user cancels', async () => {
        (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);
        rt.history.add({
            id: '1',
            timestamp: Date.now(),
            source: 'task',
            label: 'keep',
            soundPath: ''
        });

        await factoryHandler!();
        expect(rt.history.getAll()).toHaveLength(1);
    });
});
