import * as vscode from 'vscode';

/**
 * AI provider abstraction layer.
 *
 * Defines a uniform interface for chat-style AI providers used by the Fahh extension.
 * Each provider implementation translates the unified `chat()` call into its own HTTP
 * shape so the rest of the codebase can stay provider-agnostic.
 *
 * SECURITY: Providers never accept API keys via constructor. They are passed per-call
 * from the SecretManager so the keys are never retained in memory beyond the request.
 */

/** Identifier strings used in settings and SecretStorage. */
export type AiProviderId =
    | 'copilot'
    | 'openrouter'
    | 'groq'
    | 'gemini'
    | 'huggingface'
    | 'mistral'
    | 'together'
    | 'cohere'
    | 'openai'
    | 'anthropic';

/**
 * Provider category used by the wizard to group providers.
 *  - `free`: providers with a usable free tier or free open-source models
 *  - `paid`: closed-source commercial providers (charges per token)
 *  - `builtin`: uses VS Code's built-in LM API (Copilot)
 */
export type ProviderCategory = 'free' | 'paid' | 'builtin';

/** Metadata about a provider used by the wizard and validators. */
export interface AiProviderInfo {
    /** Stable identifier (matches `fahh.aiProvider` enum value). */
    readonly id: AiProviderId;
    /** Human-readable display name. */
    readonly displayName: string;
    /** One-line description shown in the wizard. */
    readonly description: string;
    /** URL where the user can sign up and generate an API key. */
    readonly getKeyUrl: string;
    /** Regex used to validate the API key format. `null` means "no key required". */
    readonly keyFormat: RegExp | null;
    /** Human-readable expected key format (for validation messages). */
    readonly keyFormatHint: string;
    /** List of recommended model identifiers. */
    readonly models: readonly string[];
    /** Default model selected when the user doesn't override. */
    readonly defaultModel: string;
    /** Category: free open-source, paid closed-source, or VS Code built-in. */
    readonly category: ProviderCategory;
}

/** Per-request parameters passed to `AiProvider.chat`. */
export interface AiChatRequest {
    /** Free-form user prompt. */
    readonly prompt: string;
    /** Hard cap on tokens to generate. */
    readonly maxTokens: number;
    /** API key (already retrieved from SecretStorage by the caller). */
    readonly apiKey: string;
    /** Model identifier to use for this request. */
    readonly model: string;
    /** Optional abort signal so callers can cancel in-flight requests. */
    readonly signal?: AbortSignal;
}

/** Contract every provider implementation must satisfy. */
export interface AiProvider {
    readonly info: AiProviderInfo;
    /**
     * Send a single-turn chat completion request to the provider.
     * @returns The provider's text response, or `null` if the call failed.
     */
    chat(request: AiChatRequest): Promise<string | null>;
}

/** HTTP request timeout for any provider call. */
const REQUEST_TIMEOUT_MS = 30000;

/** Common headers identifying this extension to providers that look at User-Agent. */
const COMMON_HEADERS: Record<string, string> = {
    'User-Agent': 'Fahh-VSCode-Extension'
};

/**
 * OpenRouter implementation.
 * Uses the OpenAI-compatible chat completions endpoint.
 * Free models marked with `:free` suffix.
 */
class OpenRouterProvider implements AiProvider {
    public readonly info: AiProviderInfo = {
        id: 'openrouter',
        displayName: 'OpenRouter',
        description: 'Free access to Llama, Gemma, Mistral and more (rate-limited).',
        getKeyUrl: 'https://openrouter.ai/keys',
        keyFormat: /^sk-or-v1-[A-Za-z0-9_-]{20,}$/,
        keyFormatHint: 'starts with sk-or-v1-',
        models: [
            'meta-llama/llama-3.2-3b-instruct:free',
            'meta-llama/llama-3.1-8b-instruct:free',
            'google/gemini-2.0-flash-exp:free',
            'mistralai/mistral-7b-instruct:free',
            'qwen/qwen-2.5-7b-instruct:free'
        ],
        defaultModel: 'meta-llama/llama-3.2-3b-instruct:free',
        category: 'free'
    };

    async chat(request: AiChatRequest): Promise<string | null> {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                ...COMMON_HEADERS,
                'Authorization': `Bearer ${request.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/4nur4gmishr4/vscode-fahh-Extension',
                'X-Title': 'Fahh VS Code Extension'
            },
            body: JSON.stringify({
                model: request.model,
                messages: [{ role: 'user', content: request.prompt }],
                max_tokens: request.maxTokens
            }),
            signal: request.signal
        });

        if (!response.ok) {
            return null;
        }
        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const content = data.choices?.[0]?.message?.content;
        return content ? content.trim() : null;
    }
}

/**
 * Groq implementation.
 * OpenAI-compatible API with extremely fast inference on free tier.
 */
class GroqProvider implements AiProvider {
    public readonly info: AiProviderInfo = {
        id: 'groq',
        displayName: 'Groq',
        description: 'Extremely fast inference. Free tier: Llama 3.1/3.3, Gemma, Mixtral.',
        getKeyUrl: 'https://console.groq.com/keys',
        keyFormat: /^gsk_[A-Za-z0-9]{40,}$/,
        keyFormatHint: 'starts with gsk_',
        models: [
            'llama-3.3-70b-versatile',
            'llama-3.1-8b-instant',
            'gemma2-9b-it',
            'mixtral-8x7b-32768'
        ],
        defaultModel: 'llama-3.1-8b-instant',
        category: 'free'
    };

    async chat(request: AiChatRequest): Promise<string | null> {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                ...COMMON_HEADERS,
                'Authorization': `Bearer ${request.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: request.model,
                messages: [{ role: 'user', content: request.prompt }],
                max_tokens: request.maxTokens
            }),
            signal: request.signal
        });

        if (!response.ok) {
            return null;
        }
        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const content = data.choices?.[0]?.message?.content;
        return content ? content.trim() : null;
    }
}

/**
 * Google Gemini implementation.
 * Uses Google's REST API with `key` query param (Google's own auth scheme).
 */
class GeminiProvider implements AiProvider {
    public readonly info: AiProviderInfo = {
        id: 'gemini',
        displayName: 'Google Gemini',
        description: 'Generous free tier (1500 req/day) on gemini-2.0-flash.',
        getKeyUrl: 'https://aistudio.google.com/apikey',
        keyFormat: /^AIza[A-Za-z0-9_-]{35}$/,
        keyFormatHint: 'starts with AIza (39 characters)',
        models: [
            'gemini-2.0-flash',
            'gemini-1.5-flash',
            'gemini-1.5-flash-8b',
            'gemini-1.5-pro'
        ],
        defaultModel: 'gemini-2.0-flash',
        category: 'free'
    };

    async chat(request: AiChatRequest): Promise<string | null> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent?key=${encodeURIComponent(request.apiKey)}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...COMMON_HEADERS,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
                generationConfig: { maxOutputTokens: request.maxTokens }
            }),
            signal: request.signal
        });

        if (!response.ok) {
            return null;
        }
        const data = await response.json() as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const parts = data.candidates?.[0]?.content?.parts;
        const text = parts?.map(p => p.text ?? '').join('').trim();
        return text || null;
    }
}

/**
 * Hugging Face Inference implementation.
 * Uses the router chat-completions endpoint which mirrors OpenAI's shape across HF-hosted models.
 */
class HuggingFaceProvider implements AiProvider {
    public readonly info: AiProviderInfo = {
        id: 'huggingface',
        displayName: 'Hugging Face',
        description: 'Free inference API for open-source chat models.',
        getKeyUrl: 'https://huggingface.co/settings/tokens',
        keyFormat: /^hf_[A-Za-z0-9]{30,}$/,
        keyFormatHint: 'starts with hf_',
        models: [
            'mistralai/Mistral-7B-Instruct-v0.3',
            'meta-llama/Llama-3.2-3B-Instruct',
            'HuggingFaceH4/zephyr-7b-beta',
            'Qwen/Qwen2.5-7B-Instruct'
        ],
        defaultModel: 'mistralai/Mistral-7B-Instruct-v0.3',
        category: 'free'
    };

    async chat(request: AiChatRequest): Promise<string | null> {
        const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
            method: 'POST',
            headers: {
                ...COMMON_HEADERS,
                'Authorization': `Bearer ${request.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: request.model,
                messages: [{ role: 'user', content: request.prompt }],
                max_tokens: request.maxTokens
            }),
            signal: request.signal
        });

        if (!response.ok) {
            return null;
        }
        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const content = data.choices?.[0]?.message?.content;
        return content ? content.trim() : null;
    }
}

/**
 * GitHub Copilot implementation.
 * Uses the VS Code Language Model API — no API key required, the user authenticates
 * via the Copilot extension itself.
 */
class CopilotProvider implements AiProvider {
    public readonly info: AiProviderInfo = {
        id: 'copilot',
        displayName: 'GitHub Copilot',
        description: 'Uses your existing Copilot subscription (or Copilot Free). No key needed.',
        getKeyUrl: 'https://github.com/features/copilot',
        keyFormat: null,
        keyFormatHint: 'no API key required',
        models: ['copilot-default'],
        defaultModel: 'copilot-default',
        category: 'builtin'
    };

    async chat(request: AiChatRequest): Promise<string | null> {
        const models = await vscode.lm?.selectChatModels?.({});
        if (!models || models.length === 0) {
            return null;
        }
        const model = models[0];
        const messages = [vscode.LanguageModelChatMessage.User(request.prompt)];
        const tokenSource = new vscode.CancellationTokenSource();
        try {
            const response = await model.sendRequest(messages, {}, tokenSource.token);
            let text = '';
            for await (const chunk of response.text) {
                text += chunk;
            }
            return text.trim() || null;
        } finally {
            tokenSource.dispose();
        }
    }
}

/**
 * Mistral AI (la Plateforme) implementation.
 * Has a generous free tier for `open-*` and `mistral-small-latest` models.
 */
class MistralProvider implements AiProvider {
    public readonly info: AiProviderInfo = {
        id: 'mistral',
        displayName: 'Mistral AI',
        description: 'Free tier for open-mistral, ministral, and Codestral models.',
        getKeyUrl: 'https://console.mistral.ai/api-keys',
        keyFormat: /^[A-Za-z0-9]{32,}$/,
        keyFormatHint: '32+ alphanumeric characters',
        models: [
            'open-mistral-nemo',
            'ministral-3b-latest',
            'ministral-8b-latest',
            'mistral-small-latest',
            'codestral-latest'
        ],
        defaultModel: 'open-mistral-nemo',
        category: 'free'
    };

    async chat(request: AiChatRequest): Promise<string | null> {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                ...COMMON_HEADERS,
                'Authorization': `Bearer ${request.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: request.model,
                messages: [{ role: 'user', content: request.prompt }],
                max_tokens: request.maxTokens
            }),
            signal: request.signal
        });
        if (!response.ok) { return null; }
        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const content = data.choices?.[0]?.message?.content;
        return content ? content.trim() : null;
    }
}

/**
 * Together AI implementation.
 * OpenAI-compatible API hosting many open-source models with free trial credit.
 */
class TogetherProvider implements AiProvider {
    public readonly info: AiProviderInfo = {
        id: 'together',
        displayName: 'Together AI',
        description: 'Free trial credit for 200+ open-source models (Llama, DeepSeek, Mixtral).',
        getKeyUrl: 'https://api.together.ai/settings/api-keys',
        keyFormat: /^[A-Za-z0-9]{40,}$/,
        keyFormatHint: '40+ hex characters',
        models: [
            'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
            'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
            'deepseek-ai/DeepSeek-V3',
            'mistralai/Mixtral-8x7B-Instruct-v0.1'
        ],
        defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
        category: 'free'
    };

    async chat(request: AiChatRequest): Promise<string | null> {
        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
            method: 'POST',
            headers: {
                ...COMMON_HEADERS,
                'Authorization': `Bearer ${request.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: request.model,
                messages: [{ role: 'user', content: request.prompt }],
                max_tokens: request.maxTokens
            }),
            signal: request.signal
        });
        if (!response.ok) { return null; }
        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const content = data.choices?.[0]?.message?.content;
        return content ? content.trim() : null;
    }
}

/**
 * Cohere implementation.
 * Free tier: ~1000 requests/month on Command R / Command R+.
 */
class CohereProvider implements AiProvider {
    public readonly info: AiProviderInfo = {
        id: 'cohere',
        displayName: 'Cohere',
        description: 'Free tier (~1000 req/month) on Command R and Command R+.',
        getKeyUrl: 'https://dashboard.cohere.com/api-keys',
        keyFormat: /^[A-Za-z0-9]{40,}$/,
        keyFormatHint: '40+ alphanumeric characters',
        models: [
            'command-r-plus-08-2024',
            'command-r-08-2024',
            'command-r',
            'command-light'
        ],
        defaultModel: 'command-r-08-2024',
        category: 'free'
    };

    async chat(request: AiChatRequest): Promise<string | null> {
        // Cohere v2 uses an OpenAI-compatible /v2/chat endpoint
        const response = await fetch('https://api.cohere.com/v2/chat', {
            method: 'POST',
            headers: {
                ...COMMON_HEADERS,
                'Authorization': `Bearer ${request.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: request.model,
                messages: [{ role: 'user', content: request.prompt }],
                max_tokens: request.maxTokens
            }),
            signal: request.signal
        });
        if (!response.ok) { return null; }
        const data = await response.json() as { message?: { content?: { text?: string }[] } };
        const parts = data.message?.content;
        const text = parts?.map(p => p.text ?? '').join('').trim();
        return text || null;
    }
}

/**
 * OpenAI implementation.
 * Closed-source, paid. Supports GPT-4o, GPT-4o-mini, GPT-3.5-turbo.
 */
class OpenAIProvider implements AiProvider {
    public readonly info: AiProviderInfo = {
        id: 'openai',
        displayName: 'OpenAI',
        description: 'GPT-4o, GPT-4o-mini, GPT-3.5. Pay per token (no free tier).',
        getKeyUrl: 'https://platform.openai.com/api-keys',
        keyFormat: /^sk-(proj-)?[A-Za-z0-9_-]{20,}$/,
        keyFormatHint: 'starts with sk- or sk-proj-',
        models: [
            'gpt-4o-mini',
            'gpt-4o',
            'gpt-4-turbo',
            'gpt-3.5-turbo'
        ],
        defaultModel: 'gpt-4o-mini',
        category: 'paid'
    };

    async chat(request: AiChatRequest): Promise<string | null> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                ...COMMON_HEADERS,
                'Authorization': `Bearer ${request.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: request.model,
                messages: [{ role: 'user', content: request.prompt }],
                max_tokens: request.maxTokens
            }),
            signal: request.signal
        });
        if (!response.ok) { return null; }
        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const content = data.choices?.[0]?.message?.content;
        return content ? content.trim() : null;
    }
}

/**
 * Anthropic Claude implementation.
 * Closed-source, paid. Uses a distinct request/response shape.
 */
class AnthropicProvider implements AiProvider {
    public readonly info: AiProviderInfo = {
        id: 'anthropic',
        displayName: 'Anthropic Claude',
        description: 'Claude 3.5 Sonnet / Haiku / Opus. Pay per token (no free tier).',
        getKeyUrl: 'https://console.anthropic.com/settings/keys',
        keyFormat: /^sk-ant-[A-Za-z0-9_-]{20,}$/,
        keyFormatHint: 'starts with sk-ant-',
        models: [
            'claude-3-5-haiku-latest',
            'claude-3-5-sonnet-latest',
            'claude-3-haiku-20240307',
            'claude-3-opus-latest'
        ],
        defaultModel: 'claude-3-5-haiku-latest',
        category: 'paid'
    };

    async chat(request: AiChatRequest): Promise<string | null> {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                ...COMMON_HEADERS,
                'x-api-key': request.apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: request.model,
                max_tokens: request.maxTokens,
                messages: [{ role: 'user', content: request.prompt }]
            }),
            signal: request.signal
        });
        if (!response.ok) { return null; }
        const data = await response.json() as { content?: { type?: string; text?: string }[] };
        const text = data.content?.filter(p => p.type === 'text').map(p => p.text ?? '').join('').trim();
        return text || null;
    }
}

/** Registry of all known providers, keyed by id. */
const REGISTRY: Readonly<Record<AiProviderId, AiProvider>> = Object.freeze({
    openrouter: new OpenRouterProvider(),
    groq: new GroqProvider(),
    gemini: new GeminiProvider(),
    huggingface: new HuggingFaceProvider(),
    mistral: new MistralProvider(),
    together: new TogetherProvider(),
    cohere: new CohereProvider(),
    openai: new OpenAIProvider(),
    anthropic: new AnthropicProvider(),
    copilot: new CopilotProvider()
});

/** Returns the provider implementation for the given id, or `null` if unknown. */
export function getProvider(id: string): AiProvider | null {
    const normalized = id.toLowerCase() as AiProviderId;
    return REGISTRY[normalized] ?? null;
}

/**
 * Returns metadata for all providers, ordered by category:
 *   1. Free / open-source providers (OpenRouter, Groq, Gemini, HF, Mistral, Together, Cohere)
 *   2. Paid / closed-source providers (OpenAI, Anthropic)
 *   3. VS Code built-in (Copilot)
 */
export function listProviders(): readonly AiProviderInfo[] {
    return [
        REGISTRY.openrouter.info,
        REGISTRY.groq.info,
        REGISTRY.gemini.info,
        REGISTRY.huggingface.info,
        REGISTRY.mistral.info,
        REGISTRY.together.info,
        REGISTRY.cohere.info,
        REGISTRY.openai.info,
        REGISTRY.anthropic.info,
        REGISTRY.copilot.info
    ];
}

/** Returns the info block for a single provider id. */
export function getProviderInfo(id: string): AiProviderInfo | null {
    return getProvider(id)?.info ?? null;
}

/**
 * Validate that an API key matches the provider's expected format.
 * @throws Error with a human-readable message if the key is invalid.
 */
export function validateProviderKey(providerId: string, apiKey: string): void {
    const provider = getProvider(providerId);
    if (!provider) {
        throw new Error(`Unknown AI provider: ${providerId}`);
    }
    if (provider.info.keyFormat === null) {
        return;
    }
    const trimmed = apiKey.trim();
    if (trimmed.length < 20) {
        throw new Error(`API key for ${provider.info.displayName} is too short (minimum 20 characters)`);
    }
    if (trimmed.length > 500) {
        throw new Error(`API key for ${provider.info.displayName} is too long (maximum 500 characters)`);
    }
    if (!provider.info.keyFormat.test(trimmed)) {
        throw new Error(
            `Invalid ${provider.info.displayName} API key format. Expected: ${provider.info.keyFormatHint}.`
        );
    }
}

/**
 * Wrap a provider chat call with a hard timeout and error-swallowing semantics so
 * the caller can rely on `null` for any failure mode.
 */
export async function chatWithTimeout(
    provider: AiProvider,
    request: Omit<AiChatRequest, 'signal'>,
    timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await provider.chat({ ...request, signal: controller.signal });
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}
