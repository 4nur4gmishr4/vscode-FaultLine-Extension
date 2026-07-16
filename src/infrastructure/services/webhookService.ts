import * as https from 'https';
import * as dns from 'dns';
import * as net from 'net';
import { Logger } from '../../shared/utils/logger';
import { ConfigManager } from '../../shared/config/configManager';
import { SecretManager } from '../../shared/config/secretManager';

const WEBHOOK_MAX_RETRIES = 3;
const WEBHOOK_RETRY_DELAY_MS = 1000;
/** Minimum interval between automatic Jira issue creates (ms). */
const JIRA_MIN_INTERVAL_MS = 30_000;

/** IPv4 ranges that must never be reached from an unconstrained webhook (SSRF guard). */
const PRIVATE_IPV4_PATTERNS: readonly RegExp[] = [
    /^0\./,                          // "this host" / 0.0.0.0
    /^127\./,                        // loopback
    /^10\./,                         // RFC1918
    /^192\.168\./,                   // RFC1918
    /^169\.254\./,                   // link-local
    /^172\.(1[6-9]|2\d|3[0-1])\./    // RFC1918 172.16.0.0–172.31.255.255
];

function isPrivateIPv4(ip: string): boolean {
    return PRIVATE_IPV4_PATTERNS.some((re) => re.test(ip));
}

/**
 * Expand a valid IPv6 address to eight lowercase hextets (for range checks).
 * Returns null if the string is not a parseable IPv6 literal.
 */
function expandIPv6(ip: string): string[] | null {
    if (net.isIP(ip) !== 6) {
        return null;
    }
    const raw = ip.toLowerCase();
    if (raw.startsWith('::ffff:') && raw.includes('.')) {
        // IPv4-mapped handled by caller before expand
        return null;
    }
    const sides = raw.split('::');
    if (sides.length > 2) {
        return null;
    }
    const head = sides[0] ? sides[0].split(':').filter(Boolean) : [];
    const tail = sides.length === 2 && sides[1] ? sides[1].split(':').filter(Boolean) : [];
    if (sides.length === 1) {
        if (head.length !== 8) {
            return null;
        }
        return head.map((h) => h.padStart(4, '0'));
    }
    const missing = 8 - head.length - tail.length;
    if (missing < 0) {
        return null;
    }
    const mid = Array.from({ length: missing }, () => '0000');
    return [...head, ...mid, ...tail].map((h) => h.padStart(4, '0'));
}

function isPrivateIPv6(ip: string): boolean {
    const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
    if (mapped) {
        return isPrivateIPv4(mapped[1]);
    }
    const hextets = expandIPv6(ip);
    if (!hextets) {
        // Unparseable IP-looking string: fail closed when net.isIP said v6
        return true;
    }
    const joined = hextets.join(':');
    if (joined === '0000:0000:0000:0000:0000:0000:0000:0001') {
        return true; // loopback
    }
    if (joined === '0000:0000:0000:0000:0000:0000:0000:0000') {
        return true; // unspecified
    }
    const first = parseInt(hextets[0], 16);
    if (Number.isNaN(first)) {
        return true;
    }
    // fe80::/10 link-local
    if ((first & 0xffc0) === 0xfe80) {
        return true;
    }
    // fc00::/7 unique local
    if ((first & 0xfe00) === 0xfc00) {
        return true;
    }
    return false;
}

/**
 * Returns true if the host is loopback / private / link-local and therefore a plausible
 * SSRF target. Uses `net.isIP` so hostnames like `facebook.com` are never treated as IPv6 ULA.
 * Users opt into internal hosts via an allowlist.
 */
export function isPrivateHost(host: string): boolean {
    const h = host.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
    if (h === 'localhost' || h.endsWith('.local')) {
        return true;
    }

    const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(h);
    if (mapped) {
        return isPrivateIPv4(mapped[1]);
    }

    const ver = net.isIP(h);
    if (ver === 4) {
        return isPrivateIPv4(h);
    }
    if (ver === 6) {
        return isPrivateIPv6(h);
    }
    // DNS name (not an IP literal): not private by string prefix alone.
    return false;
}

/**
 * Pure gate for Jira base URLs: HTTPS + Atlassian host only.
 */
export function evaluateJiraUrl(rawUrl: string): WebhookUrlDecision {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return { allowed: false, reason: 'Invalid Jira URL format.' };
    }
    if (url.protocol !== 'https:') {
        return { allowed: false, reason: `Jira URL must use https: (got ${url.protocol}).` };
    }
    const host = url.hostname.toLowerCase();
    if (!host.endsWith('.atlassian.net') && !host.endsWith('.jira.com')) {
        return {
            allowed: false,
            reason: 'Jira URL must be an authorized Atlassian domain to prevent credential theft.'
        };
    }
    return { allowed: true };
}

export interface WebhookUrlDecision {
    readonly allowed: boolean;
    /** Human-readable reason when `allowed` is false (safe to log). */
    readonly reason?: string;
    /**
     * When set, HTTPS should connect to this address (IP pin) rather than re-resolving
     * the hostname at connect time (mitigates DNS rebinding TOCTOU).
     */
    readonly connectHost?: string;
    /** TLS SNI / cert hostname (original URL host when connectHost is an IP). */
    readonly servername?: string;
}

/**
 * Pure SSRF/format gate for outbound webhook URLs (no DNS).
 * HTTPS only. Allowlist (exact host match) opts into private hostnames.
 * Call {@link evaluateWebhookUrlResolved} before connecting so resolved IPs are checked.
 */
export function evaluateWebhookUrl(rawUrl: string, allowedDomains: ReadonlyArray<string>): WebhookUrlDecision {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return { allowed: false, reason: 'Invalid webhook URL format.' };
    }
    if (url.protocol !== 'https:') {
        return { allowed: false, reason: `Invalid webhook URL protocol: ${url.protocol}. Must be https:` };
    }

    const host = url.hostname.toLowerCase();
    if (allowedDomains.length > 0) {
        const allowed = allowedDomains.some((d) => d.trim().toLowerCase() === host);
        return allowed
            ? { allowed: true }
            : { allowed: false, reason: `Webhook host "${host}" is not in faultline.webhookAllowedDomains. Skipping POST.` };
    }
    if (isPrivateHost(host)) {
        return { allowed: false, reason: `Webhook to private host "${host}" blocked for security. Add to webhookAllowedDomains to allow.` };
    }
    return { allowed: true };
}

/**
 * Static checks + DNS resolution. Blocks if any resolved address is private,
 * unless the hostname itself is private and explicitly allowlisted (opt-in LAN).
 */
export async function evaluateWebhookUrlResolved(
    rawUrl: string,
    allowedDomains: ReadonlyArray<string>
): Promise<WebhookUrlDecision> {
    const staticDecision = evaluateWebhookUrl(rawUrl, allowedDomains);
    if (!staticDecision.allowed) {
        return staticDecision;
    }

    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return { allowed: false, reason: 'Invalid webhook URL format.' };
    }

    const host = url.hostname.toLowerCase();
    const allowlistedPrivate =
        allowedDomains.length > 0 &&
        allowedDomains.some((d) => d.trim().toLowerCase() === host) &&
        isPrivateHost(host);
    if (allowlistedPrivate) {
        // Opt-in LAN: connect by hostname (may be private IP literal or mDNS name).
        return { allowed: true, connectHost: host, servername: host };
    }

    // Public host already allowlisted (or no allowlist): still DNS-check + pin.
    if (net.isIP(host)) {
        // Literal public IP — no separate SNI host.
        return { allowed: true, connectHost: host, servername: host };
    }

    try {
        const results = await dns.promises.lookup(host, { all: true });
        if (results.length === 0) {
            return { allowed: false, reason: `Webhook host "${host}" did not resolve to any address.` };
        }
        const publicAddrs: string[] = [];
        for (const { address } of results) {
            if (isPrivateHost(address)) {
                return {
                    allowed: false,
                    reason: `Webhook host "${host}" resolves to private address "${address}". Blocked for SSRF protection.`
                };
            }
            publicAddrs.push(address);
        }
        // Pin TCP to the first public address; keep original host for TLS SNI.
        return {
            allowed: true,
            connectHost: publicAddrs[0],
            servername: host
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { allowed: false, reason: `Webhook DNS lookup failed for "${host}": ${msg}` };
    }
}

/**
 * Service for sending failure notifications via webhooks and Jira.
 */
export class WebhookService {
    private readonly pendingTimers = new Set<ReturnType<typeof setTimeout>>();
    private disposed = false;
    private lastJiraPostAt = 0;

    constructor(
        private readonly configManager: ConfigManager,
        private readonly secretManager: SecretManager,
        private readonly logger: Logger
    ) {}

    public postWebhook(label: string, source: string): void {
        if (this.disposed) {
            return;
        }
        const cfg = this.configManager.readConfig().webhook;
        if (!cfg.url) {
            return;
        }

        void this.postWebhookSafe(label, source, cfg.url, cfg.allowedDomains);
    }

    private async postWebhookSafe(
        label: string,
        source: string,
        rawUrl: string,
        allowedDomains: ReadonlyArray<string>
    ): Promise<void> {
        await this.postWebhookWithRetry(label, source, rawUrl, allowedDomains, 0);
    }

    /**
     * POST with retries. Re-runs SSRF/DNS checks on every attempt (mitigates rebinding TOCTOU).
     */
    private async postWebhookWithRetry(
        label: string,
        source: string,
        rawUrl: string,
        allowedDomains: ReadonlyArray<string>,
        attempt: number
    ): Promise<void> {
        if (this.disposed) {
            return;
        }

        const decision = await evaluateWebhookUrlResolved(rawUrl, allowedDomains);
        if (!decision.allowed) {
            this.logger.warn(decision.reason ?? 'Webhook URL rejected.');
            return;
        }

        const cfg = this.configManager.readConfig().webhook;
        try {
            const payload = this.formatWebhookPayload(label, source, cfg.format);
            const url = new URL(rawUrl);
            // HTTPS-only. Prefer IP pin from DNS decision so connect cannot rebind.
            const connectHost = decision.connectHost ?? url.hostname;
            const servername = decision.servername ?? url.hostname;
            const transport = https;

            const options: https.RequestOptions = {
                host: connectHost,
                servername,
                port: url.port || 443,
                path: (url.pathname || '/') + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                    Host: url.host
                },
                timeout: 5000
            };

            await new Promise<void>((resolve) => {
                const req = transport.request(options, (res) => {
                    if (res.statusCode && res.statusCode >= 400) {
                        this.logger.warn(`Webhook returned ${res.statusCode}`);
                        if (attempt < WEBHOOK_MAX_RETRIES && res.statusCode >= 500) {
                            this.scheduleRetry(label, source, rawUrl, allowedDomains, attempt);
                        }
                    }
                    res.resume();
                    resolve();
                });

                req.on('error', (e) => {
                    this.logger.error('Webhook error', e);
                    if (attempt < WEBHOOK_MAX_RETRIES) {
                        this.scheduleRetry(label, source, rawUrl, allowedDomains, attempt);
                    }
                    resolve();
                });

                req.on('timeout', () => {
                    req.destroy();
                    if (attempt < WEBHOOK_MAX_RETRIES) {
                        this.scheduleRetry(label, source, rawUrl, allowedDomains, attempt);
                    }
                    resolve();
                });

                req.write(payload);
                req.end();
            });
        } catch (e) {
            this.logger.error('Webhook failed', e);
        }
    }

    private scheduleRetry(
        label: string,
        source: string,
        rawUrl: string,
        allowedDomains: ReadonlyArray<string>,
        attempt: number
    ): void {
        if (this.disposed) {
            return;
        }
        const delay = WEBHOOK_RETRY_DELAY_MS * Math.pow(2, attempt);
        const timer = setTimeout(() => {
            this.pendingTimers.delete(timer);
            void this.postWebhookWithRetry(label, source, rawUrl, allowedDomains, attempt + 1);
        }, delay);
        this.pendingTimers.add(timer);
    }

    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        for (const timer of this.pendingTimers) {
            clearTimeout(timer);
        }
        this.pendingTimers.clear();
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
        if (this.disposed) {
            return false;
        }

        const cfg = this.configManager.readConfig().webhook;
        if (!cfg.jiraEnabled) {
            return false;
        }
        if (!cfg.jiraUrl || !cfg.jiraProject || !cfg.jiraEmail) {
            return false;
        }

        const now = Date.now();
        if (now - this.lastJiraPostAt < JIRA_MIN_INTERVAL_MS) {
            this.logger.debug('Jira create skipped (rate limit).');
            return false;
        }

        const jiraGate = evaluateJiraUrl(cfg.jiraUrl);
        if (!jiraGate.allowed) {
            this.logger.warn(jiraGate.reason ?? 'Jira URL rejected.');
            return false;
        }

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(cfg.jiraUrl);
        } catch {
            this.logger.warn(`Invalid Jira URL configured.`);
            return false;
        }

        const apiKey = await this.secretManager.getApiKey('jira');
        if (!apiKey) {
            this.logger.warn('Jira API key not found in SecretStorage');
            return false;
        }

        const auth = Buffer.from(`${cfg.jiraEmail}:${apiKey}`).toString('base64');
        // Origin only — never trust path/userinfo from config for credentialed requests.
        const url = `${parsedUrl.origin}/rest/api/3/issue`;

        const safeLabel = label.slice(0, 200);
        const payload = {
            fields: {
                project: { key: cfg.jiraProject },
                summary: `[FaultLine] ${source} failed: ${safeLabel}`.slice(0, 255),
                description: {
                    type: 'doc', version: 1,
                    content: [{
                        type: 'paragraph',
                        content: [{ type: 'text', text: `Source: ${source}\nLabel: ${safeLabel}\nTimestamp: ${new Date().toISOString()}` }]
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

            this.lastJiraPostAt = Date.now();
            const data = await response.json() as { key?: string };
            this.logger.info(`Jira ticket created: ${data.key}`);
            return true;
        } catch (err) {
            this.logger.warn(`Jira integration error: ${err instanceof Error ? err.message : String(err)}`);
            return false;
        }
    }
}
