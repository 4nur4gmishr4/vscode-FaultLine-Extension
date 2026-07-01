import { ConfigManager } from '../../../shared/config/configManager';
import * as vscode from 'vscode';
import { Logger } from '../../../shared/utils/logger';

describe('ConfigManager', () => {
    let manager: ConfigManager;
    let mockSecrets: any;
    let mockLogger: Logger;

    beforeEach(() => {
        mockSecrets = { get: jest.fn() };
        mockLogger = new Logger('test');
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((_key: string, def: any) => def),
            update: jest.fn()
        });
        manager = new ConfigManager(mockSecrets, mockLogger);
    });

    it('reads configuration', () => {
        const config = manager.readConfig();
        expect(config).toBeDefined();
        expect(config.core).toBeDefined();
    });
});
