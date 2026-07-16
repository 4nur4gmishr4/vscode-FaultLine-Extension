import * as vscode from 'vscode';
import { TerminalDetector } from '../../../infrastructure/detectors/terminalDetector';
import { Logger } from '../../../shared/utils/logger';
import type { FaultLineConfig, FailureEvent } from '../../../domain/types/index';

function asyncChunks(parts: string[]): AsyncIterable<string> {
    return {
        async *[Symbol.asyncIterator]() {
            for (const p of parts) {
                yield p;
            }
        }
    };
}

describe('TerminalDetector', () => {
    let onFailure: jest.Mock;
    let startCb: (e: unknown) => void;
    let endCb: (e: unknown) => void;
    let closeCb: (t: unknown) => void;
    let config: FaultLineConfig;

    function registerDetector(): void {
        (vscode.window.onDidStartTerminalShellExecution as jest.Mock).mockImplementation((cb: (e: unknown) => void) => {
            startCb = cb;
            return { dispose: jest.fn() };
        });
        (vscode.window.onDidEndTerminalShellExecution as jest.Mock).mockImplementation((cb: (e: unknown) => void) => {
            endCb = cb;
            return { dispose: jest.fn() };
        });
        (vscode.window.onDidCloseTerminal as jest.Mock).mockImplementation((cb: (t: unknown) => void) => {
            closeCb = cb;
            return { dispose: jest.fn() };
        });

        const detector = new TerminalDetector(() => config, new Logger('test'), onFailure);
        detector.register([]);
    }

    beforeEach(() => {
        onFailure = jest.fn();
        config = {
            detection: { sources: new Set(['shell', 'terminal']) }
        } as unknown as FaultLineConfig;
        registerDetector();
    });

    it('fires shell failure with buffered output and sanitized label', async () => {
        const execution = {
            commandLine: { value: 'npm test --token=supersecretvalue' },
            read: () => asyncChunks(['line1\n', 'line2\n'])
        };

        startCb({ execution });
        // Allow stream consumer to attach and finish
        await Promise.resolve();
        await Promise.resolve();

        endCb({ execution, exitCode: 1 });
        await new Promise((r) => setTimeout(r, 30));

        expect(onFailure).toHaveBeenCalledTimes(1);
        const event = onFailure.mock.calls[0][0] as FailureEvent;
        expect(event.source).toBe('shell');
        expect(event.label).toContain('[REDACTED]');
        expect(event.output).toContain('line1');
        expect(event.output).toContain('line2');
    });

    it('does not fire on exit 0', async () => {
        const execution = {
            commandLine: { value: 'echo ok' },
            read: () => asyncChunks(['ok'])
        };
        startCb({ execution });
        await Promise.resolve();
        endCb({ execution, exitCode: 0 });
        await new Promise((r) => setTimeout(r, 30));
        expect(onFailure).not.toHaveBeenCalled();
    });

    it('fires terminal source on non-zero close', () => {
        closeCb({ name: 'zsh', exitStatus: { code: 1 } });
        expect(onFailure).toHaveBeenCalledWith(
            expect.objectContaining({ source: 'terminal', label: 'zsh' })
        );
    });

    it('respects sources set (shell disabled)', async () => {
        onFailure.mockClear();
        config = {
            detection: { sources: new Set(['terminal']) }
        } as unknown as FaultLineConfig;
        registerDetector();

        const execution = {
            commandLine: { value: 'fail' },
            read: () => asyncChunks(['x'])
        };
        startCb({ execution });
        await Promise.resolve();
        endCb({ execution, exitCode: 2 });
        await new Promise((r) => setTimeout(r, 30));

        const shellCalls = onFailure.mock.calls.filter((c) => (c[0] as FailureEvent).source === 'shell');
        expect(shellCalls).toHaveLength(0);
    });
});
