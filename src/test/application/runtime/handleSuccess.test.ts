import * as vscode from 'vscode';
import { FaultLineRuntime } from '../../../application/runtime/faultline';

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
        extension: { packageJSON: { version: '3.5.0' } },
        subscriptions: [] as { dispose: () => void }[]
    };
}

describe('FaultLineRuntime.handleSuccess + dispose', () => {
    let rt: FaultLineRuntime;

    beforeEach(() => {
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((_k: string, def?: unknown) => {
                if (_k === 'successEnabled') {
                    return true;
                }
                return def;
            }),
            update: jest.fn(),
            inspect: jest.fn()
        });
        rt = new FaultLineRuntime(mockContext() as never);
        jest.spyOn(rt.resolver, 'resolveForFailure').mockResolvedValue('/tmp/ok.mp3');
        jest.spyOn(rt.player, 'play').mockResolvedValue(undefined);
        jest.spyOn(rt.statusBar, 'refresh');
    });

    afterEach(() => {
        rt.dispose();
        jest.restoreAllMocks();
    });

    it('plays success sound when enabled', async () => {
        const handleSuccess = (rt as unknown as {
            handleSuccess: (s: string, l: string) => Promise<void>;
        }).handleSuccess.bind(rt);

        const cfg = rt.configManager.readConfig();
        jest.spyOn(rt.configManager, 'readConfig').mockReturnValue({
            ...cfg,
            audio: { ...cfg.audio, successEnabled: true, soundsEnabled: true }
        });

        await handleSuccess('task', 'build');
        expect(rt.player.play).toHaveBeenCalled();
        expect(rt.statusBar.refresh).toHaveBeenCalled();
    });

    it('skips when snoozed', async () => {
        rt.scheduler.snooze(10);
        const handleSuccess = (rt as unknown as {
            handleSuccess: (s: string, l: string) => Promise<void>;
        }).handleSuccess.bind(rt);
        await handleSuccess('task', 'build');
        expect(rt.player.play).not.toHaveBeenCalled();
    });

    it('activate registers detectors without throw', () => {
        expect(() => rt.activate()).not.toThrow();
    });

    it('dispose is idempotent', () => {
        rt.dispose();
        expect(() => rt.dispose()).not.toThrow();
    });

    it('registerDetectors isolates detector failures', () => {
        const original = (rt as unknown as { registerDetectors: () => void }).registerDetectors;
        expect(() => original.call(rt)).not.toThrow();
    });
});
