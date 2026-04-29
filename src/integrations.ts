import { execFile } from 'child_process';
import * as https from 'https';
import { Logger } from './logger';
import { FahhConfig } from './config';

export class IntegrationsManager {
    private lastSuccessStreak = 0;
    private bossHp = 100;
    private dailyFailCount = 0;
    private dailyTimer: NodeJS.Timeout | null = null;

    public constructor(private readonly config: () => FahhConfig, private readonly logger: Logger) {
        this.scheduleDailySummary();
    }

    public dispose(): void {
        if (this.dailyTimer) {
            clearTimeout(this.dailyTimer);
        }
    }

    public speak(text: string): void {
        const cfg = this.config();
        if (!cfg.speakLabel) {
            return;
        }
        const platform = process.platform;
        if (platform === 'darwin') {
            execFile('say', [text.slice(0, 200)], { windowsHide: true }, () => {});
        } else if (platform === 'win32') {
            const script = `$s = New-Object -ComObject SAPI.SpVoice; $s.Speak('${text.replace(/'/g, "''").slice(0, 200)}')`;
            execFile('powershell', ['-Command', script], { windowsHide: true }, () => {});
        } else {
            execFile('espeak', [text.slice(0, 200)], { windowsHide: true }, () => {});
        }
    }

    public postWebhook(label: string, source: string): void {
        const cfg = this.config();
        if (!cfg.webhookUrl) {
            return;
        }
        try {
            const payload = JSON.stringify({
                text: `Fahh: ${label}`,
                source,
                timestamp: new Date().toISOString(),
                workspace: 'vscode'
            });
            const url = new URL(cfg.webhookUrl);
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            };
            const req = https.request(options, (res) => {
                if (res.statusCode && res.statusCode >= 400) {
                    this.logger.warn(`Webhook returned ${res.statusCode}`);
                }
            });
            req.on('error', (e) => this.logger.error('Webhook error', e));
            req.write(payload);
            req.end();
        } catch (e) {
            this.logger.error('Webhook failed', e);
        }
    }

    public async getAiSummary(label: string): Promise<string | null> {
        const cfg = this.config();
        if (!cfg.aiSummaryEnabled) {
            return null;
        }
        try {
            // VS Code Language Model API (requires Copilot or compatible extension)
            const models = await (vscode as any).lm?.selectChatModels?.({});
            if (!models || models.length === 0) {
                return null;
            }
            const model = models[0];
            const messages = [
                (vscode as any).lm.createSystemMessage('You summarize build failures concisely. One sentence only.'),
                (vscode as any).lm.createUserMessage(`Explain this failure: ${label}`)
            ];
            const response = await model.sendRequest(messages, {}, new (vscode as any).CancellationTokenSource().token);
            let text = '';
            for await (const chunk of response.text) {
                text += chunk;
            }
            return text.slice(0, 200) || null;
        } catch {
            return null;
        }
    }

    public recordFailure(): string | null {
        const cfg = this.config();
        this.dailyFailCount++;
        this.lastSuccessStreak = 0;

        if (cfg.bossFightMode) {
            this.bossHp = Math.max(0, this.bossHp - 10);
            if (this.bossHp <= 0) {
                this.bossHp = 100;
                return '💀 DEFEAT! Boss HP depleted. Resetting...';
            }
            return `⚔️ Boss HP: ${this.bossHp}%`;
        }
        return null;
    }

    public recordSuccess(): string | null {
        const cfg = this.config();
        this.lastSuccessStreak++;

        if (cfg.streakCounter) {
            if (this.lastSuccessStreak >= 10 && this.lastSuccessStreak % 10 === 0) {
                return `🔥 ${this.lastSuccessStreak} successes in a row!`;
            }
        }

        if (cfg.bossFightMode && this.bossHp < 100) {
            this.bossHp = Math.min(100, this.bossHp + 5);
        }
        return null;
    }

    public getDailySummary(): string {
        return `Today: ${this.dailyFailCount} failures, ${this.lastSuccessStreak} current success streak.`;
    }

    private scheduleDailySummary(): void {
        const cfg = this.config();
        if (!cfg.dailySummary) {
            return;
        }
        const now = new Date();
        const target = new Date(now);
        target.setHours(18, 0, 0, 0);
        if (target <= now) {
            target.setDate(target.getDate() + 1);
        }
        const ms = target.getTime() - now.getTime();
        this.dailyTimer = setTimeout(() => {
            this.logger.info(this.getDailySummary());
            // Reset daily counter at summary time
            this.dailyFailCount = 0;
            this.scheduleDailySummary();
        }, ms);
    }
}

// Minimal shim for vscode namespace in this module
declare const vscode: any;
