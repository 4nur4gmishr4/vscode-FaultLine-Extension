/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { ConfigManager } from '../config/configManager';
import { SecretManager } from '../config/secretManager';
import { chatWithTimeout, getProvider } from './aiProviders';

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
            if (!cfg.summaryEnabled && !cfg.errorExplanationEnabled) {
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

    private async callProvider(providerId: string, prompt: string, maxTokens: number): Promise<string | null> {
        const normalized = (providerId || '').toLowerCase();

        if (normalized === 'copilot') {
            return await this.callCopilot(prompt);
        }

        const provider = getProvider(normalized);
        if (!provider) {
            this.logger.warn(`Unknown AI provider "${providerId}". Skipping AI call.`);
            return null;
        }

        const apiKey = await this.secretManager.getApiKey(normalized);
        if (!apiKey) {
            this.logger.debug(`No API key configured for provider "${normalized}". Skipping AI call.`);
            return null;
        }

        const model = this.resolveModel() ?? provider.info.defaultModel;
        return await chatWithTimeout(provider, { prompt, maxTokens, apiKey, model });
    }

    private async callCopilot(prompt: string): Promise<string | null> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const models = await (vscode as any).lm?.selectChatModels?.({});
            if (!models || models.length === 0) {
                return null;
            }
            const model = models[0];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const messages = [(vscode as any).LanguageModelChatMessage.User(prompt)];
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
        } catch (err) {
            this.logger.debug(`Copilot call unavailable: ${err instanceof Error ? err.message : String(err)}`);
            return null;
        }
    }

    private resolveModel(): string | undefined {
        const model = this.configManager.readConfig().ai.model;
        return model && model.trim().length > 0 ? model.trim() : undefined;
    }
}
