/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as http from 'http';
import * as https from 'https';
import { Logger } from '../utils/logger';
import { ConfigManager } from '../config/configManager';
import { SecretManager } from '../config/secretManager';

const WEBHOOK_MAX_RETRIES = 3;
const WEBHOOK_RETRY_DELAY_MS = 1000;

/**
 * Service for sending failure notifications via webhooks and Jira.
 */
export class WebhookService {
    constructor(
        private readonly configManager: ConfigManager,
        private readonly secretManager: SecretManager,
        private readonly logger: Logger
    ) {}

    public postWebhook(label: string, source: string): void {
        const cfg = this.configManager.readConfig().webhook;
        if (!cfg.url) {
            return;
        }

        let url: URL;
        try {
            url = new URL(cfg.url);
        } catch {
            this.logger.warn(`Invalid webhook URL format: ${cfg.url}`);
            return;
        }
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            this.logger.warn(`Invalid webhook URL protocol: ${url.protocol}. Must be http: or https:`);
            return;
        }

        const host = url.hostname.toLowerCase();
        const isPrivateIp = /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)|localhost|::1/.test(host);
        
        if (cfg.allowedDomains.length > 0) {
            const allowed = cfg.allowedDomains.includes(host);
            if (!allowed) {
                this.logger.warn(`Webhook host "${host}" is not in faultline.webhookAllowedDomains. Skipping POST.`);
                return;
            }
        } else if (isPrivateIp) {
            this.logger.warn(`Webhook to private IP "${host}" blocked for security. Add to webhookAllowedDomains to allow.`);
            return;
        }

        this.postWebhookWithRetry(label, source, 0);
    }

    private postWebhookWithRetry(label: string, source: string, attempt: number): void {
        const cfg = this.configManager.readConfig().webhook;
        try {
            const payload = this.formatWebhookPayload(label, source, cfg.format);
            const url = new URL(cfg.url);
            const isHttps = url.protocol === 'https:';
            const transport = isHttps ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: (url.pathname || '/') + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                },
                timeout: 5000
            };

            const req = transport.request(options, (res) => {
                if (res.statusCode && res.statusCode >= 400) {
                    this.logger.warn(`Webhook returned ${res.statusCode}`);
                    if (attempt < WEBHOOK_MAX_RETRIES && res.statusCode >= 500) {
                        const delay = WEBHOOK_RETRY_DELAY_MS * Math.pow(2, attempt);
                        setTimeout(() => this.postWebhookWithRetry(label, source, attempt + 1), delay);
                    }
                }
                res.resume();
            });

            req.on('error', (e) => {
                this.logger.error('Webhook error', e);
                if (attempt < WEBHOOK_MAX_RETRIES) {
                    const delay = WEBHOOK_RETRY_DELAY_MS * Math.pow(2, attempt);
                    setTimeout(() => this.postWebhookWithRetry(label, source, attempt + 1), delay);
                }
            });

            req.on('timeout', () => {
                req.destroy();
                if (attempt < WEBHOOK_MAX_RETRIES) {
                    const delay = WEBHOOK_RETRY_DELAY_MS * Math.pow(2, attempt);
                    setTimeout(() => this.postWebhookWithRetry(label, source, attempt + 1), delay);
                }
            });

            req.write(payload);
            req.end();
        } catch (e) {
            this.logger.error('Webhook failed', e);
        }
    }

    private formatWebhookPayload(label: string, source: string, format: string): string {
        const timestamp = new Date().toISOString();
        if (format === 'slack') {
            return JSON.stringify({
                text: `FaultLine: ${label}`,
                attachments: [{
                    color: 'danger',
                    fields: [
                        { title: 'Source', value: source, short: true },
                        { title: 'Timestamp', value: timestamp, short: true },
                        { title: 'Label', value: label, short: false }
                    ],
                    ts: Math.floor(Date.now() / 1000)
                }]
            });
        }
        if (format === 'discord') {
            return JSON.stringify({
                embeds: [{
                    title: 'FaultLine Failure Detected',
                    color: 16711680,
                    fields: [
                        { name: 'Source', value: source, inline: true },
                        { name: 'Timestamp', value: timestamp, inline: true },
                        { name: 'Message', value: label }
                    ],
                    timestamp
                }]
            });
        }
        return JSON.stringify({ text: `FaultLine: ${label}`, source, timestamp, workspace: 'vscode' });
    }

    public async postToJira(label: string, source: string): Promise<boolean> {
        const cfg = this.configManager.readConfig().webhook;
        if (!cfg.jiraUrl || !cfg.jiraProject || !cfg.jiraEmail) {
            return false;
        }

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(cfg.jiraUrl);
        } catch {
            this.logger.warn(`Invalid Jira URL configured.`);
            return false;
        }

        if (!parsedUrl.hostname.endsWith('.atlassian.net') && !parsedUrl.hostname.endsWith('.jira.com')) {
            this.logger.warn(`Jira URL must be an authorized Atlassian domain to prevent credential theft.`);
            return false;
        }

        const apiKey = await this.secretManager.getApiKey('jira');
        if (!apiKey) {
            this.logger.warn('Jira API key not found in SecretStorage');
            return false;
        }

        const auth = Buffer.from(`${cfg.jiraEmail}:${apiKey}`).toString('base64');
        const url = `${cfg.jiraUrl}/rest/api/3/issue`;

        const payload = {
            fields: {
                project: { key: cfg.jiraProject },
                summary: `[FaultLine] ${source} failed: ${label}`,
                description: {
                    type: 'doc', version: 1,
                    content: [{
                        type: 'paragraph',
                        content: [{ type: 'text', text: `Source: ${source}\nLabel: ${label}\nTimestamp: ${new Date().toISOString()}` }]
                    }]
                },
                issuetype: { name: 'Bug' }
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(15000)
            });

            if (!response.ok) {
                this.logger.warn(`Jira API request failed: ${response.status}`);
                return false;
            }

            const data = await response.json() as { key?: string };
            this.logger.info(`Jira ticket created: ${data.key}`);
            return true;
        } catch (err) {
            this.logger.warn(`Jira integration error: ${err instanceof Error ? err.message : String(err)}`);
            return false;
        }
    }
}
