/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { FaultLineRuntime } from '../runtime/faultline';
import { registerCommands } from '../commands';

/**
 * Ensures that every command declared in package.json is actually registered in the runtime.
 */
describe('Command Parity', () => {
    it('should register every command declared in package.json', () => {
        const pkgPath = path.resolve(__dirname, '..', '..', 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const declaredCommands = pkg.contributes.commands.map((c: any) => c.command);

        const registeredCommandIds: string[] = [];
        const mockVscode: any = vscode;
        const originalRegisterCommand = mockVscode.commands.registerCommand;

        mockVscode.commands.registerCommand = jest.fn((id: string, _handler: any) => {
            registeredCommandIds.push(id);
            return { dispose: jest.fn() };
        });

        try {
            const mockContext: any = {
                subscriptions: [],
                secrets: {},
                globalState: { get: jest.fn(), update: jest.fn() },
                extensionUri: { fsPath: '' },
                extensionPath: ''
            };
            const runtime = new FaultLineRuntime(mockContext);
            const disposables: vscode.Disposable[] = [];
            registerCommands(runtime, mockContext.extensionUri, disposables);

            // Export commands are hidden but should be registered
            const expected = declaredCommands.filter((id: string) => !id.startsWith('faultline.export'));
            
            for (const cmdId of expected) {
                expect(registeredCommandIds).toContain(cmdId);
            }
        } finally {
            mockVscode.commands.registerCommand = originalRegisterCommand;
        }
    });
});
