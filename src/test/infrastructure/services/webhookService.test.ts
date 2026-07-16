import * as dns from 'dns';
import {
    evaluateJiraUrl,
    evaluateWebhookUrl,
    evaluateWebhookUrlResolved,
    isPrivateHost
} from '../../../infrastructure/services/webhookService';

describe('WebhookService SSRF', () => {
    describe('isPrivateHost', () => {
        it('detects private IPv4 correctly', () => {
            expect(isPrivateHost('127.0.0.1')).toBe(true);
            expect(isPrivateHost('10.0.0.1')).toBe(true);
            expect(isPrivateHost('192.168.1.1')).toBe(true);
            expect(isPrivateHost('172.16.0.1')).toBe(true);
            expect(isPrivateHost('169.254.1.1')).toBe(true);
            expect(isPrivateHost('8.8.8.8')).toBe(false);
            expect(isPrivateHost('1.1.1.1')).toBe(false);
        });

        it('does not treat hostnames as IPv6 ULA (facebook.com regression)', () => {
            expect(isPrivateHost('facebook.com')).toBe(false);
            expect(isPrivateHost('fc-api.example.com')).toBe(false);
            expect(isPrivateHost('hooks.slack.com')).toBe(false);
        });

        it('detects IPv6 loopback, ULA, and link-local', () => {
            expect(isPrivateHost('::1')).toBe(true);
            expect(isPrivateHost('0:0:0:0:0:0:0:1')).toBe(true);
            expect(isPrivateHost('fc00::1')).toBe(true);
            expect(isPrivateHost('fd12:3456:789a::1')).toBe(true);
            expect(isPrivateHost('fe80::1')).toBe(true);
            expect(isPrivateHost('2001:4860:4860::8888')).toBe(false);
        });

        it('detects IPv4-mapped IPv6 private addresses', () => {
            expect(isPrivateHost('::ffff:10.0.0.1')).toBe(true);
            expect(isPrivateHost('::ffff:8.8.8.8')).toBe(false);
        });

        it('treats localhost and .local as private', () => {
            expect(isPrivateHost('localhost')).toBe(true);
            expect(isPrivateHost('myhost.local')).toBe(true);
        });
    });

    it('rejects http and private hosts without allowlist', () => {
        expect(evaluateWebhookUrl('http://example.com/hook', []).allowed).toBe(false);
        expect(evaluateWebhookUrl('https://127.0.0.1/hook', []).allowed).toBe(false);
        expect(evaluateWebhookUrl('https://example.com/hook', []).allowed).toBe(true);
    });

    it('allowlists exact hosts including private opt-in', () => {
        expect(evaluateWebhookUrl('https://hooks.example.com/x', ['hooks.example.com']).allowed).toBe(true);
        expect(evaluateWebhookUrl('https://hooks.example.com/x', ['other.com']).allowed).toBe(false);
        expect(evaluateWebhookUrl('https://192.168.1.5/hook', ['192.168.1.5']).allowed).toBe(true);
    });

    describe('evaluateJiraUrl', () => {
        it('requires https and Atlassian hosts', () => {
            expect(evaluateJiraUrl('https://acme.atlassian.net').allowed).toBe(true);
            expect(evaluateJiraUrl('http://acme.atlassian.net').allowed).toBe(false);
            expect(evaluateJiraUrl('https://evil.example.com').allowed).toBe(false);
            expect(evaluateJiraUrl('not-a-url').allowed).toBe(false);
        });
    });

    describe('DNS resolution re-check', () => {
        let lookupSpy: jest.SpyInstance;

        afterEach(() => {
            lookupSpy?.mockRestore();
        });

        it('blocks when hostname resolves to a private IP', async () => {
            lookupSpy = jest.spyOn(dns.promises, 'lookup').mockResolvedValue([
                { address: '10.0.0.5', family: 4 }
            ] as never);

            const decision = await evaluateWebhookUrlResolved('https://evil.example.com/hook', []);
            expect(decision.allowed).toBe(false);
            expect(decision.reason).toMatch(/private address/i);
        });

        it('allows when hostname resolves only to public IPs and pins connect host', async () => {
            lookupSpy = jest.spyOn(dns.promises, 'lookup').mockResolvedValue([
                { address: '8.8.8.8', family: 4 }
            ] as never);

            const decision = await evaluateWebhookUrlResolved('https://hooks.example.com/hook', []);
            expect(decision.allowed).toBe(true);
            expect(decision.connectHost).toBe('8.8.8.8');
            expect(decision.servername).toBe('hooks.example.com');
        });

        it('skips DNS check for allowlisted private hostnames', async () => {
            lookupSpy = jest.spyOn(dns.promises, 'lookup').mockImplementation(() => {
                throw new Error('lookup should not run for allowlisted private hosts');
            });

            const decision = await evaluateWebhookUrlResolved('https://192.168.1.5/hook', ['192.168.1.5']);
            expect(decision.allowed).toBe(true);
            expect(lookupSpy).not.toHaveBeenCalled();
        });

        it('fails closed when DNS lookup fails', async () => {
            lookupSpy = jest.spyOn(dns.promises, 'lookup').mockRejectedValue(new Error('ENOTFOUND'));

            const decision = await evaluateWebhookUrlResolved('https://missing.example.com/hook', []);
            expect(decision.allowed).toBe(false);
            expect(decision.reason).toMatch(/DNS lookup failed/i);
        });
    });
});
