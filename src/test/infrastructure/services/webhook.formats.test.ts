import { WebhookService } from '../../../infrastructure/services/webhookService';
import { Logger } from '../../../shared/utils/logger';

function makeService(webhook: Record<string, unknown> = {}) {
    const configManager = {
        readConfig: jest.fn(() => ({
            webhook: {
                url: '',
                allowedDomains: [],
                format: 'default',
                jiraEnabled: false,
                jiraUrl: '',
                jiraProject: '',
                jiraEmail: '',
                ...webhook
            }
        }))
    };
    const secretManager = {
        getApiKey: jest.fn(async () => null)
    };
    return new WebhookService(configManager as never, secretManager as never, new Logger('t'));
}

describe('WebhookService formats and jira gates', () => {
    it('formatWebhookPayload supports slack/discord/default', () => {
        const svc = makeService();
        const fmt = (svc as unknown as {
            formatWebhookPayload: (l: string, s: string, f: string) => string;
        }).formatWebhookPayload.bind(svc);

        const slack = JSON.parse(fmt('fail', 'task', 'slack'));
        expect(slack.attachments).toBeDefined();

        const discord = JSON.parse(fmt('fail', 'task', 'discord'));
        expect(discord.embeds).toBeDefined();

        const def = JSON.parse(fmt('fail', 'task', 'default'));
        expect(def.text).toContain('FaultLine');
    });

    it('postWebhook no-ops without URL', () => {
        const svc = makeService({ url: '' });
        expect(() => svc.postWebhook('x', 'task')).not.toThrow();
    });

    it('postToJira returns false when disabled', async () => {
        const svc = makeService({ jiraEnabled: false });
        expect(await svc.postToJira('x', 'task')).toBe(false);
    });

    it('postToJira returns false when incomplete config', async () => {
        const svc = makeService({
            jiraEnabled: true,
            jiraUrl: '',
            jiraProject: 'P',
            jiraEmail: 'a@b.com'
        });
        expect(await svc.postToJira('x', 'task')).toBe(false);
    });

    it('postToJira rejects non-Atlassian hosts', async () => {
        const svc = makeService({
            jiraEnabled: true,
            jiraUrl: 'https://evil.example.com',
            jiraProject: 'P',
            jiraEmail: 'a@b.com'
        });
        expect(await svc.postToJira('x', 'task')).toBe(false);
    });

    it('dispose is idempotent', () => {
        const svc = makeService();
        svc.dispose();
        svc.dispose();
        expect(() => svc.postWebhook('x', 'task')).not.toThrow();
    });
});
