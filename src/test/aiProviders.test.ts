/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
    listProviders,
    getProvider,
    getProviderInfo,
    validateProviderKey,
    chatWithTimeout
} from '../services/aiProviders';

describe('aiProviders registry', () => {
    describe('listProviders', () => {
        it('exposes exactly the ten supported providers in stable order', () => {
            const ids = listProviders().map(p => p.id);
            expect(ids).toEqual([
                'openrouter',
                'groq',
                'gemini',
                'huggingface',
                'mistral',
                'together',
                'cohere',
                'openai',
                'anthropic',
                'copilot'
            ]);
        });

        it('groups providers by category (free, paid, builtin)', () => {
            const byCategory = listProviders().reduce<Record<string, string[]>>((acc, p) => {
                acc[p.category] = acc[p.category] ?? [];
                acc[p.category].push(p.id);
                return acc;
            }, {});

            expect(byCategory.free).toEqual(expect.arrayContaining([
                'openrouter', 'groq', 'gemini', 'huggingface', 'mistral', 'together', 'cohere'
            ]));
            expect(byCategory.paid).toEqual(['openai', 'anthropic']);
            expect(byCategory.builtin).toEqual(['copilot']);
        });

        it('every provider has a non-empty defaultModel inside its models list', () => {
            for (const info of listProviders()) {
                expect(info.defaultModel).toBeTruthy();
                expect(info.models).toContain(info.defaultModel);
            }
        });
    });

    describe('getProvider / getProviderInfo', () => {
        it('returns the same instance for upper- and lower-case ids', () => {
            const lower = getProvider('openrouter');
            const upper = getProvider('OPENROUTER');
            expect(lower).not.toBeNull();
            expect(upper).toBe(lower);
        });

        it('returns null for an unknown id', () => {
            expect(getProvider('does-not-exist')).toBeNull();
            expect(getProviderInfo('does-not-exist')).toBeNull();
        });

        it('getProviderInfo proxies through getProvider', () => {
            const info = getProviderInfo('groq');
            expect(info).not.toBeNull();
            expect(info?.id).toBe('groq');
        });
    });

    describe('validateProviderKey', () => {
        it('throws for an unknown provider id', () => {
            expect(() => validateProviderKey('nope', 'sk-or-v1-' + 'a'.repeat(40)))
                .toThrow(/Unknown AI provider/);
        });

        it('returns silently for copilot (no key required)', () => {
            expect(() => validateProviderKey('copilot', '')).not.toThrow();
            expect(() => validateProviderKey('copilot', 'anything')).not.toThrow();
        });

        it('rejects keys shorter than 20 characters', () => {
            expect(() => validateProviderKey('openrouter', 'sk-or-v1-short'))
                .toThrow(/too short/i);
        });

        it('rejects keys longer than 500 characters', () => {
            const huge = 'sk-or-v1-' + 'a'.repeat(600);
            expect(() => validateProviderKey('openrouter', huge))
                .toThrow(/too long/i);
        });

        it('rejects an OpenRouter key that does not start with sk-or-v1-', () => {
            const wrongPrefix = 'sk-wrong-' + 'a'.repeat(40);
            expect(() => validateProviderKey('openrouter', wrongPrefix))
                .toThrow(/Invalid OpenRouter API key format/);
        });

        it('accepts a well-formed OpenRouter key', () => {
            const good = 'sk-or-v1-' + 'a'.repeat(40);
            expect(() => validateProviderKey('openrouter', good)).not.toThrow();
        });

        it('accepts well-formed keys for every non-copilot provider', () => {
            const samples: Record<string, string> = {
                openrouter: 'sk-or-v1-' + 'a'.repeat(40),
                groq: 'gsk_' + 'a'.repeat(50),
                gemini: 'AIza' + 'a'.repeat(35),
                huggingface: 'hf_' + 'a'.repeat(40),
                mistral: 'a'.repeat(40),
                together: 'a'.repeat(50),
                cohere: 'a'.repeat(50),
                openai: 'sk-' + 'a'.repeat(40),
                anthropic: 'sk-ant-' + 'a'.repeat(40)
            };
            for (const [id, key] of Object.entries(samples)) {
                expect(() => validateProviderKey(id, key)).not.toThrow();
            }
        });
    });

    describe('chatWithTimeout', () => {
        it('throws when the provider rejects', async () => {
            const provider = {
                info: getProvider('openrouter')!.info,
                chat: jest.fn().mockRejectedValue(new Error('boom'))
            };
            await expect(chatWithTimeout(
                provider,
                { prompt: 'hi', maxTokens: 8, apiKey: 'k', model: 'm' },
                100
            )).rejects.toThrow('boom');
        });

        it('throws an error when the timeout fires', async () => {
            let receivedSignal: AbortSignal | undefined;
            const provider = {
                info: getProvider('openrouter')!.info,
                chat: jest.fn().mockImplementation((req: { signal?: AbortSignal }) => {
                    receivedSignal = req.signal;
                    return new Promise<string | null>((_resolve, reject) => {
                        req.signal?.addEventListener('abort', () => reject(new Error('aborted')));
                    });
                })
            };
            await expect(chatWithTimeout(
                provider,
                { prompt: 'hi', maxTokens: 8, apiKey: 'k', model: 'm' },
                50
            )).rejects.toThrow('aborted');
            expect(receivedSignal).toBeDefined();
            expect(receivedSignal?.aborted).toBe(true);
        });

        it('returns the provider response on success', async () => {
            const provider = {
                info: getProvider('openrouter')!.info,
                chat: jest.fn().mockResolvedValue('the response')
            };
            const result = await chatWithTimeout(
                provider,
                { prompt: 'hi', maxTokens: 8, apiKey: 'k', model: 'm' },
                500
            );
            expect(result).toBe('the response');
        });
    });
});
