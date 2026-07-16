import * as vscode from 'vscode';
import { DiagnosticDetector } from '../../../infrastructure/detectors/diagnosticDetector';
import type { FaultLineConfig } from '../../../domain/types/index';

describe('DiagnosticDetector', () => {
    let onFailure: jest.Mock;
    let changeCb: (e: { uris: { path: string; toString: () => string }[] }) => void;
    let config: FaultLineConfig;

    beforeEach(() => {
        jest.useFakeTimers();
        onFailure = jest.fn();
        config = {
            detection: {
                sources: new Set(['diagnostics']),
                diagnosticsThreshold: 1
            }
        } as unknown as FaultLineConfig;

        (vscode.languages.onDidChangeDiagnostics as jest.Mock).mockImplementation((cb: typeof changeCb) => {
            changeCb = cb;
            return { dispose: jest.fn() };
        });
        (vscode.workspace as unknown as { textDocuments: unknown[] }).textDocuments = [];

        new DiagnosticDetector(() => config, onFailure).register([]);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('fires when error count rises above threshold', () => {
        const uri = { path: '/src/app.ts', toString: () => 'file:///src/app.ts' };
        (vscode.languages.getDiagnostics as jest.Mock).mockReturnValue([
            { severity: vscode.DiagnosticSeverity.Error },
            { severity: vscode.DiagnosticSeverity.Error }
        ]);

        changeCb({ uris: [uri] });
        jest.advanceTimersByTime(500);

        expect(onFailure).toHaveBeenCalledWith(
            expect.objectContaining({
                source: 'diagnostics',
                label: expect.stringContaining('app.ts')
            })
        );
    });

    it('does not fire when count does not increase', () => {
        const uri = { path: '/src/app.ts', toString: () => 'file:///src/app.ts' };
        (vscode.languages.getDiagnostics as jest.Mock).mockReturnValue([
            { severity: vscode.DiagnosticSeverity.Error }
        ]);
        changeCb({ uris: [uri] });
        jest.advanceTimersByTime(500);
        onFailure.mockClear();

        // same count again
        changeCb({ uris: [uri] });
        jest.advanceTimersByTime(500);
        expect(onFailure).not.toHaveBeenCalled();
    });
});
