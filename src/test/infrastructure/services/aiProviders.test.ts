import {
    getProvider,
    listProviders,
    validateProviderKey
} from '../../../infrastructure/services/aiProviders';

describe('aiProviders registry', () => {
    it('lists all expected provider ids', () => {
        const ids = listProviders().map((p) => p.id);
        expect(ids).toEqual(
            expect.arrayContaining([
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
            ])
        );
        expect(ids).toHaveLength(10);
    });

    it('resolves providers case-insensitively', () => {
        expect(getProvider('OpenRouter')?.info.id).toBe('openrouter');
        expect(getProvider('unknown')).toBeNull();
    });

    it('validateProviderKey accepts copilot without a key', () => {
        expect(() => validateProviderKey('copilot', '')).not.toThrow();
    });

    it('validateProviderKey rejects short or wrong-format keys', () => {
        expect(() => validateProviderKey('openrouter', 'short')).toThrow(/too short/i);
        expect(() => validateProviderKey('openrouter', 'sk-or-v1-not-valid-format!!!')).toThrow(/format/i);
        expect(() => validateProviderKey('openai', 'sk-abcdefghijklmnopqrstuvwxyz')).not.toThrow();
        expect(() => validateProviderKey('nope', 'sk-abcdefghijklmnopqrstuvwxyz')).toThrow(/Unknown/i);
    });

    it('documents HTTPS chat endpoints for commercial providers', () => {
        for (const info of listProviders()) {
            expect(info.defaultModel.length).toBeGreaterThan(0);
            expect(info.models.length).toBeGreaterThan(0);
            if (info.keyFormat !== null) {
                expect(info.getKeyUrl.startsWith('https://')).toBe(true);
            }
        }
    });
});

describe('aiProviders chat HTTP contracts (mocked fetch)', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        global.fetch = originalFetch;
        jest.restoreAllMocks();
    });

    function mockJsonOk(body: unknown): void {
        global.fetch = jest.fn(async () =>
            ({
                ok: true,
                status: 200,
                statusText: 'OK',
                json: async () => body
            }) as Response
        );
    }

    function mockHttpError(status: number): void {
        global.fetch = jest.fn(async () =>
            ({
                ok: false,
                status,
                statusText: 'Error',
                json: async () => ({})
            }) as Response
        );
    }

    const baseReq = {
        prompt: 'hello',
        maxTokens: 50,
        apiKey: 'sk-test-key-abcdefghijklmnopqrstuvwxyz',
        model: 'test-model'
    };

    it('OpenAI-compatible providers POST chat/completions and parse choices', async () => {
        mockJsonOk({ choices: [{ message: { content: '  ok  ' } }] });
        for (const id of ['openai', 'groq', 'mistral', 'together', 'huggingface', 'openrouter'] as const) {
            const p = getProvider(id);
            expect(p).toBeTruthy();
            const text = await p!.chat({ ...baseReq, model: p!.info.defaultModel });
            expect(text).toBe('ok');
            expect(global.fetch).toHaveBeenCalled();
            const [url, init] = (global.fetch as jest.Mock).mock.calls.at(-1) as [string, RequestInit];
            expect(url).toMatch(/^https:\/\//);
            expect(init.method).toBe('POST');
            expect(String(init.headers && JSON.stringify(init.headers))).toMatch(/Authorization|authorization/i);
        }
    });

    it('Gemini uses generateContent + x-goog-api-key', async () => {
        mockJsonOk({
            candidates: [{ content: { parts: [{ text: 'gemini says hi' }] } }]
        });
        const p = getProvider('gemini')!;
        const text = await p.chat({ ...baseReq, model: 'gemini-2.0-flash' });
        expect(text).toBe('gemini says hi');
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        expect(url).toContain('generativelanguage.googleapis.com');
        expect(url).toContain('generateContent');
        expect(JSON.stringify(init.headers)).toMatch(/x-goog-api-key/i);
    });

    it('Anthropic uses /v1/messages + x-api-key', async () => {
        mockJsonOk({ content: [{ type: 'text', text: 'claude' }] });
        const p = getProvider('anthropic')!;
        const text = await p.chat({ ...baseReq, model: p.info.defaultModel });
        expect(text).toBe('claude');
        const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://api.anthropic.com/v1/messages');
        expect(JSON.stringify(init.headers)).toMatch(/x-api-key/i);
    });

    it('Cohere uses /v2/chat and maps message.content', async () => {
        mockJsonOk({ message: { content: [{ text: 'co' }, { text: 'here' }] } });
        const p = getProvider('cohere')!;
        const text = await p.chat({ ...baseReq, model: p.info.defaultModel });
        expect(text).toBe('cohere');
        const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
        expect(url).toBe('https://api.cohere.com/v2/chat');
    });

    it('throws HTTP errors for failed OpenAI-style responses', async () => {
        mockHttpError(429);
        const p = getProvider('openai')!;
        await expect(p.chat(baseReq)).rejects.toThrow(/HTTP 429/);
    });

    it('OpenRouter sets HTTP-Referer to the correct GitHub repo', async () => {
        mockJsonOk({ choices: [{ message: { content: 'r' } }] });
        const p = getProvider('openrouter')!;
        await p.chat({ ...baseReq, model: p.info.defaultModel });
        const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
        const headers = init.headers as Record<string, string>;
        expect(headers['HTTP-Referer']).toBe(
            'https://github.com/4nur4gmishr4/vscode-FaultLine-Extension'
        );
    });
});
