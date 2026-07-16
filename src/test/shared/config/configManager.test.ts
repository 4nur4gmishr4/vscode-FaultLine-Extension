import { ConfigManager } from '../../../shared/config/configManager';
import * as vscode from 'vscode';
import { Logger } from '../../../shared/utils/logger';

describe('ConfigManager', () => {
    let manager: ConfigManager;
    let mockSecrets: { get: jest.Mock };
    let mockLogger: Logger;

    beforeEach(() => {
        mockSecrets = { get: jest.fn() };
        mockLogger = new Logger('test');
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((_key: string, def?: unknown) => def),
            update: jest.fn()
        });
        manager = new ConfigManager(mockSecrets as never, mockLogger);
    });

    it('reads configuration', () => {
        const config = manager.readConfig();
        expect(config).toBeDefined();
        expect(config.core).toBeDefined();
    });

    it('defaults AI auto-show and Jira to off (privacy / opt-in)', () => {
        const config = manager.readConfig();
        expect(config.ai.errorExplanationAutoShow).toBe(false);
        expect(config.webhook.jiraEnabled).toBe(false);
    });

    it('affectsDetectors is false (live configFn — no rebind by default)', () => {
        const event = {
            affectsConfiguration: jest.fn(() => true)
        } as unknown as import('vscode').ConfigurationChangeEvent;
        expect(manager.affectsDetectors(event)).toBe(false);
    });
});
