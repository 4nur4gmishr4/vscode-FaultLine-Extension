import { SecretManager } from '../../../shared/config/secretManager';

describe('SecretManager', () => {
    let mockSecrets: { get: jest.Mock; store: jest.Mock; delete: jest.Mock };
    let manager: SecretManager;

    beforeEach(() => {
        mockSecrets = {
            get: jest.fn(),
            store: jest.fn(),
            delete: jest.fn()
        };
        manager = new SecretManager(mockSecrets as never);
    });

    it('stores api key', async () => {
        await manager.storeApiKey('openai', 'sk-1234');
        expect(mockSecrets.store).toHaveBeenCalledWith('faultline.apiKey.openai', 'sk-1234');
    });

    it('gets api key', async () => {
        mockSecrets.get.mockResolvedValue('sk-1234');
        const key = await manager.getApiKey('openai');
        expect(key).toBe('sk-1234');
    });
});
