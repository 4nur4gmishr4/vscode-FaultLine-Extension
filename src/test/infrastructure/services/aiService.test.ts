import * as vscode from 'vscode';
import { AIService } from '../../../infrastructure/services/aiService';
import { Logger } from '../../../shared/utils/logger';
import * as aiProviders from '../../../infrastructure/services/aiProviders';

jest.mock('../../../infrastructure/services/aiProviders', () => {
    const actual = jest.requireActual('../../../infrastructure/services/aiProviders');
    return {
        ...actual,
        getProvider: jest.fn(),
        chatWithTimeout: jest.fn()
    };
});

function mockConfig(ai: Record<string, unknown> = {}) {
    return {
        readConfig: jest.fn(() => ({
            ai: {
                summaryEnabled: false,
                provider: 'openrouter',
                model: 'test-model',
                errorExplanationEnabled: true,
                errorExplanationAutoShow: false,
                ...ai
            }
        }))
    };
}

function mockSecrets(key: string | null = 'sk-test') {
    return {
        getApiKey: jest.fn(async () => key)
    };
}

describe('AIService', () => {
    const logger = new Logger('test');

    beforeEach(() => {
        jest.clearAllMocks();
        (aiProviders.getProvider as jest.Mock).mockReturnValue({
            info: { keyFormat: /./, defaultModel: 'm' },
            chat: jest.fn()
        });
        (aiProviders.chatWithTimeout as jest.Mock).mockResolvedValue('ok reply');
    });

    it('getAiSummary returns null when disabled', async () => {
        const svc = new AIService(mockConfig({ summaryEnabled: false }) as never, mockSecrets() as never, logger);
        expect(await svc.getAiSummary('fail')).toBeNull();
        expect(aiProviders.chatWithTimeout).not.toHaveBeenCalled();
    });

    it('getAiSummary calls provider when enabled', async () => {
        const svc = new AIService(mockConfig({ summaryEnabled: true }) as never, mockSecrets() as never, logger);
        const result = await svc.getAiSummary('npm failed');
        expect(result).toBe('ok reply');
        expect(aiProviders.chatWithTimeout).toHaveBeenCalled();
    });

    it('getAiExplanation returns provider text', async () => {
        const svc = new AIService(mockConfig() as never, mockSecrets() as never, logger);
        expect(await svc.getAiExplanation('error')).toBe('ok reply');
    });

    it('getAiChat returns provider text', async () => {
        const svc = new AIService(mockConfig() as never, mockSecrets() as never, logger);
        expect(await svc.getAiChat('history')).toBe('ok reply');
    });

    it('skips when provider unknown', async () => {
        (aiProviders.getProvider as jest.Mock).mockReturnValue(undefined);
        const svc = new AIService(mockConfig({ summaryEnabled: true }) as never, mockSecrets() as never, logger);
        expect(await svc.getAiSummary('x')).toBeNull();
    });

    it('skips when API key missing', async () => {
        const svc = new AIService(mockConfig({ summaryEnabled: true }) as never, mockSecrets(null) as never, logger);
        expect(await svc.getAiSummary('x')).toBeNull();
    });

    it('copilot path does not require API key', async () => {
        (aiProviders.getProvider as jest.Mock).mockReturnValue({
            info: { keyFormat: null, defaultModel: 'copilot' }
        });
        const secrets = mockSecrets(null);
        const svc = new AIService(
            mockConfig({ summaryEnabled: true, provider: 'copilot' }) as never,
            secrets as never,
            logger
        );
        expect(await svc.getAiSummary('x')).toBe('ok reply');
        expect(secrets.getApiKey).not.toHaveBeenCalled();
    });

    it('shows error message on explanation failure', async () => {
        (aiProviders.chatWithTimeout as jest.Mock).mockRejectedValue(new Error('HTTP 429'));
        const svc = new AIService(mockConfig() as never, mockSecrets() as never, logger);
        expect(await svc.getAiExplanation('x')).toBeNull();
        expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    it('shows error message on chat failure', async () => {
        (aiProviders.chatWithTimeout as jest.Mock).mockRejectedValue(new Error('timed out'));
        const svc = new AIService(mockConfig() as never, mockSecrets() as never, logger);
        expect(await svc.getAiChat('x')).toBeNull();
        expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    it('surfaces rate-limit on summary failure', async () => {
        (aiProviders.chatWithTimeout as jest.Mock).mockRejectedValue(new Error('HTTP 401'));
        const svc = new AIService(mockConfig({ summaryEnabled: true }) as never, mockSecrets() as never, logger);
        expect(await svc.getAiSummary('x')).toBeNull();
        expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
});
