/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as vscode from 'vscode';
import { FaultLineRuntime } from '../runtime/faultline';

/**
 * Integration test for extension activation.
 */
describe('Extension Activation', () => {
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        mockContext = {
            subscriptions: [],
            secrets: {
                get: jest.fn(),
                store: jest.fn(),
                delete: jest.fn(),
                onDidChange: jest.fn()
            },
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn(),
                setKeysForSync: jest.fn()
            },
            extensionUri: vscode.Uri.file('/test/path'),
            extensionPath: '/test/path'
        } as any;
    });

    it('should initialize FaultLineRuntime and all its services', () => {
        const runtime = new FaultLineRuntime(mockContext);
        expect(runtime.configManager).toBeDefined();
        expect(runtime.secretManager).toBeDefined();
        expect(runtime.stateStore).toBeDefined();
        expect(runtime.ai).toBeDefined();
        expect(runtime.webhook).toBeDefined();

        expect(runtime.gamification).toBeDefined();
        expect(runtime.webhook).toBeDefined();

        expect(runtime.gamification).toBeDefined();
        
        runtime.activate();
        expect((runtime as any).detectors).toBeDefined();
        runtime.dispose();
    });
});
