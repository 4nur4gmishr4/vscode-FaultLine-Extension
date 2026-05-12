import * as vscode from 'vscode';
import { SecretManager } from './secretManager';

jest.mock('vscode', () => ({}), { virtual: true });

function makeStorage(): jest.Mocked<vscode.SecretStorage> {
    return {
        get: jest.fn(),
        store: jest.fn(),
        delete: jest.fn(),
        onDidChange: jest.fn()
    } as unknown as jest.Mocked<vscode.SecretStorage>;
}

describe('SecretManager', () => {
    let storage: jest.Mocked<vscode.SecretStorage>;
    let secrets: SecretManager;

    beforeEach(() => {
        storage = makeStorage();
        secrets = new SecretManager(storage);
    });

    describe('storeApiKey: input guards', () => {
        it('rejects an empty provider name', async () => {
            await expect(secrets.storeApiKey('', 'sk-or-v1-' + 'a'.repeat(40)))
                .rejects.toThrow(/Provider name cannot be empty/);
        });

        it('rejects an empty API key', async () => {
            await expect(secrets.storeApiKey('openrouter', ''))
                .rejects.toThrow(/API key cannot be empty/);
        });

        it('rejects keys shorter than 20 characters', async () => {
            await expect(secrets.storeApiKey('openrouter', 'short'))
                .rejects.toThrow(/too short/);
        });

        it('rejects keys longer than 500 characters', async () => {
            const huge = 'sk-or-v1-' + 'a'.repeat(600);
            await expect(secrets.storeApiKey('openrouter', huge))
                .rejects.toThrow(/too long/);
        });
    });

    describe('storeApiKey: provider-specific format', () => {
        it('rejects an OpenRouter key without sk-or-v1- prefix', async () => {
            const wrong = 'sk-bad-' + 'a'.repeat(40);
            await expect(secrets.storeApiKey('openrouter', wrong))
                .rejects.toThrow(/Invalid OpenRouter API key format/);
        });

        it('accepts a well-formed OpenRouter key and namespaces it under fahh.apiKey.<id>', async () => {
            const good = 'sk-or-v1-' + 'a'.repeat(40);
            await secrets.storeApiKey('openrouter', good);
            expect(storage.store).toHaveBeenCalledWith('fahh.apiKey.openrouter', good);
        });

        it('rejects a Copilot value containing spaces', async () => {
            const bad = 'ghp_' + 'a'.repeat(20) + ' suffix';
            await expect(secrets.storeApiKey('copilot', bad))
                .rejects.toThrow(/should not contain spaces/);
        });

        it('rejects a placeholder value for an unknown provider', async () => {
            const placeholder = 'your-api-key-' + 'a'.repeat(20);
            await expect(secrets.storeApiKey('groq', placeholder))
                .rejects.toThrow(/placeholder value/);
        });

        it('rejects a value with internal spaces for an unknown provider', async () => {
            await expect(secrets.storeApiKey('groq', 'has space ' + 'a'.repeat(20)))
                .rejects.toThrow(/should not contain spaces/);
        });
    });

    describe('getApiKey / hasApiKey / deleteApiKey', () => {
        it('returns null when SecretStorage has no value', async () => {
            storage.get.mockResolvedValue(undefined);
            expect(await secrets.getApiKey('openrouter')).toBeNull();
            expect(storage.get).toHaveBeenCalledWith('fahh.apiKey.openrouter');
        });

        it('returns the stored value when present', async () => {
            storage.get.mockResolvedValue('the-stored-key');
            expect(await secrets.getApiKey('openrouter')).toBe('the-stored-key');
        });

        it('hasApiKey returns true only for non-empty stored values', async () => {
            storage.get.mockResolvedValueOnce('a-key');
            expect(await secrets.hasApiKey('openrouter')).toBe(true);

            storage.get.mockResolvedValueOnce(undefined);
            expect(await secrets.hasApiKey('openrouter')).toBe(false);

            storage.get.mockResolvedValueOnce('');
            expect(await secrets.hasApiKey('openrouter')).toBe(false);
        });

        it('deleteApiKey delegates to SecretStorage with the namespaced key', async () => {
            storage.delete.mockResolvedValue(undefined);
            await secrets.deleteApiKey('openrouter');
            expect(storage.delete).toHaveBeenCalledWith('fahh.apiKey.openrouter');
        });

        it('every API rejects an empty provider id', async () => {
            await expect(secrets.getApiKey('')).rejects.toThrow(/Provider name cannot be empty/);
            await expect(secrets.hasApiKey('')).rejects.toThrow(/Provider name cannot be empty/);
            await expect(secrets.deleteApiKey('')).rejects.toThrow(/Provider name cannot be empty/);
        });
    });

    describe('storage key namespacing', () => {
        it('lowercases the provider id when computing the storage key', async () => {
            const good = 'sk-or-v1-' + 'a'.repeat(40);
            await secrets.storeApiKey('OpenRouter', good);
            expect(storage.store).toHaveBeenCalledWith('fahh.apiKey.openrouter', good);
        });
    });
});
