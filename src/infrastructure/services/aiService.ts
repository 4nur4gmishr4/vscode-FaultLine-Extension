import * as vscode from 'vscode';
import { Logger } from '../../shared/utils/logger';
import { ConfigManager } from '../../shared/config/configManager';
import { SecretManager } from '../../shared/config/secretManager';
import { chatWithTimeout, getProvider } from './aiProviders';
import { sanitizePII } from '../security/pii';

/**
 * Service for AI-generated summaries and explanations.
 */
export class AIService {
    constructor(
        private readonly configManager: ConfigManager,
        private readonly secretManager: SecretManager,
        private readonly logger: Logger
    ) {}

    public async getAiSummary(label: string): Promise<string | null> {
        try {
            const cfg = this.configManager.readConfig().ai;
            if (!cfg.summaryEnabled) {
                return null;
            }
            const prompt = `Summarize this build/shell failure in one short sentence: ${label}`;
            const result = await this.callProvider(cfg.provider, prompt, 80);
            return result ? result.slice(0, 200) : null;
        } catch (err) {
            this.logger.error('Failed to get AI summary', err);
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('HTTP 429') || msg.includes('HTTP 401') || msg.includes('timed out')) {
                void vscode.window.showErrorMessage(`FaultLine AI Summary: ${msg}`);
            }
            return null;
        }
    }

    public async getAiExplanation(label: string): Promise<string | null> {
        try {
            const cfg = this.configManager.readConfig().ai;
            const prompt =
                `You are an expert developer assistant. A VS Code terminal command or build task just failed.\n\n` +
                `Error:\n${label}\n\n` +
                `Please explain:\n1. What caused this error\n2. How to fix it\n3. Any relevant tips\n\n` +
                `Be concise and practical. Use plain text, no markdown headers.`;
            return await this.callProvider(cfg.provider, prompt, 500);
        } catch (err) {
            this.logger.error('Failed to get AI explanation', err);
            const msg = err instanceof Error ? err.message : String(err);
            void vscode.window.showErrorMessage(`FaultLine AI Explanation: ${msg}`);
            return null;
        }
    }

    public async getAiChat(history: string): Promise<string | null> {
        try {
            const cfg = this.configManager.readConfig().ai;
            return await this.callProvider(cfg.provider, history, 1000);
        } catch (err) {
            this.logger.error('Failed to get AI chat', err);
            const msg = err instanceof Error ? err.message : String(err);
            void vscode.window.showErrorMessage(`FaultLine AI Chat: ${msg}`);
            return null;
        }
    }

    private async callProvider(providerId: string, prompt: string, maxTokens: number): Promise<string | null> {
        const normalized = (providerId || '').toLowerCase();
        // Defense in depth: never send unsanitized text to any provider (summary/explain/chat).
        const safePrompt = sanitizePII(prompt);

        const provider = getProvider(normalized);
        if (!provider) {
            this.logger.warn(`Unknown AI provider "${providerId}". Skipping AI call.`);
            return null;
        }

        let apiKey = '';
        // Builtin providers (e.g. Copilot) declare keyFormat: null — no SecretStorage key.
        if (provider.info.keyFormat !== null) {
            const key = await this.secretManager.getApiKey(normalized);
            if (!key) {
                this.logger.debug(`No API key configured for provider "${normalized}". Skipping AI call.`);
                return null;
            }
            apiKey = key;
        }

        const model = this.resolveModel() ?? provider.info.defaultModel;
        return await chatWithTimeout(provider, {
            prompt: safePrompt,
            maxTokens,
            apiKey,
            model
        });
    }

    private resolveModel(): string | undefined {
        const model = this.configManager.readConfig().ai.model;
        return model && model.trim().length > 0 ? model.trim() : undefined;
    }
}
