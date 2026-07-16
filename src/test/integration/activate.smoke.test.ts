/**
 * Integration-style smoke: full activate path with vscode mocks.
 * Complements unit tests by wiring runtime + command registration.
 */
import * as vscode from 'vscode';
import { activate, deactivate } from '../../extension';
import { registerCommands } from '../../presentation/commands/index';
import { FaultLineRuntime } from '../../application/runtime/faultline';

function mockContext() {
    const mem = new Map<string, unknown>();
    // Pretend we already ran this version so welcome panel is skipped.
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
        extensionPath: '/fake/extension',
        extensionUri: vscode.Uri.file('/fake/extension'),
        extension: { packageJSON: { version: '3.5.0' } },
        subscriptions: [] as { dispose: () => void }[]
    };
}

describe('extension activate smoke', () => {
    beforeEach(() => {
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((_k: string, def?: unknown) => def),
            update: jest.fn(async () => undefined),
            inspect: jest.fn()
        });
        (vscode.commands.registerCommand as jest.Mock).mockImplementation(() => ({
            dispose: jest.fn()
        }));
    });

    afterEach(() => {
        deactivate();
        jest.restoreAllMocks();
    });

    it('activates without throwing and registers config watcher', () => {
        const ctx = mockContext();
        expect(() => activate(ctx as never)).not.toThrow();
        expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
        expect(ctx.subscriptions.length).toBeGreaterThan(0);
    });

    it('registers core commands via registerCommands', () => {
        const ctx = mockContext();
        activate(ctx as never);
        // registerCommands is called from activate; ensure registerCommand was used
        const ids = (vscode.commands.registerCommand as jest.Mock).mock.calls.map((c) => c[0] as string);
        expect(ids).toEqual(
            expect.arrayContaining([
                'faultline.toggle',
                'faultline.openSettings',
                'faultline.explainError',
                'faultline.factoryReset',
                'faultline.test'
            ])
        );
    });

    it('deactivate is safe when never activated', () => {
        expect(() => deactivate()).not.toThrow();
    });

    it('registerCommands is callable independently', () => {
        const ctx = mockContext();
        const rt = new FaultLineRuntime(ctx as never);
        const subs: { dispose: () => void }[] = [];
        expect(() => registerCommands(rt as never, ctx.extensionUri as never, subs)).not.toThrow();
        rt.dispose();
    });
});
