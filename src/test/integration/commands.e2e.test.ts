/**
 * Command e2e (mocked vscode): every palette command must register and run
 * without throwing when dependencies are stubbed.
 */
import * as path from 'path';
import * as vscode from 'vscode';
import { FaultLineRuntime } from '../../application/runtime/faultline';
import { registerCommands } from '../../presentation/commands/index';

function mockContext() {
    const mem = new Map<string, unknown>();
    mem.set('lastVersion', '3.5.0');
    mem.set('apiKeyMigrationCompleted', true);
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
        extensionPath: path.join(__dirname, '..', '..', '..'),
        extensionUri: vscode.Uri.file('/fake/extension'),
        extension: { packageJSON: { version: '3.5.0' } },
        subscriptions: [] as { dispose: () => void }[]
    };
}

describe('commands e2e (all handlers safe)', () => {
    let handlers: Map<string, (...args: unknown[]) => unknown>;
    let rt: FaultLineRuntime;

    beforeEach(() => {
        handlers = new Map();
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((_k: string, def?: unknown) => def),
            update: jest.fn(async () => undefined),
            inspect: jest.fn()
        });
        (vscode.commands.registerCommand as jest.Mock).mockImplementation(
            (id: string, fn: (...args: unknown[]) => unknown) => {
                handlers.set(id, fn);
                return { dispose: jest.fn() };
            }
        );
        (vscode.window.showOpenDialog as jest.Mock) = jest.fn(async () => undefined);
        (vscode.window.showQuickPick as jest.Mock) = jest.fn(async () => undefined);
        (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);

        const ctx = mockContext();
        rt = new FaultLineRuntime(ctx as never);
        jest.spyOn(rt.player, 'play').mockResolvedValue(undefined);
        jest.spyOn(rt.player, 'stop').mockImplementation(() => undefined);
        jest.spyOn(rt.resolver, 'resolveForFailure').mockResolvedValue(
            path.join(ctx.extensionPath, 'resources', 'packs', 'default', 'faultline.mp3')
        );
        jest.spyOn(rt.resolver, 'listSoundPacks').mockResolvedValue([
            { id: 'default', name: 'Default', path: '/packs/default' }
        ]);
        jest.spyOn(rt.resolver, 'pickFromPack').mockResolvedValue(null);
        jest.spyOn(rt.errorExplanation, 'showFailureExplanation').mockImplementation(() => undefined);

        registerCommands(rt, ctx.extensionUri as never, []);
    });

    afterEach(() => {
        rt.dispose();
        jest.restoreAllMocks();
    });

    const COMMANDS = [
        'faultline.toggle',
        'faultline.toggleSounds',
        'faultline.toggleWorkspace',
        'faultline.snooze',
        'faultline.resetSettings',
        'faultline.factoryReset',
        'faultline.showOutput',
        'faultline.showWelcome',
        'faultline.openSettings',
        'faultline.explainError',
        'faultline.test',
        'faultline.testSuccess',
        'faultline.testSound',
        'faultline.selectSound',
        'faultline.selectSoundFolder',
        'faultline.resetSound',
        'faultline.pickSoundPack',
        'faultline.stop'
    ];

    it('registers every FaultLine command', () => {
        for (const id of COMMANDS) {
            expect(handlers.has(id)).toBe(true);
        }
    });

    it.each(COMMANDS)('%s runs without throwing', async (id) => {
        const fn = handlers.get(id);
        expect(fn).toBeDefined();
        await expect(Promise.resolve(fn!(id === 'faultline.testSound' ? 'faultline.mp3' : undefined))).resolves.toBeUndefined();
    });

    it('factoryReset completes when confirmed', async () => {
        (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Factory Reset');
        await handlers.get('faultline.factoryReset')!();
        expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    it('explainError shows info when history empty', async () => {
        await handlers.get('faultline.explainError')!();
        expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });
});
