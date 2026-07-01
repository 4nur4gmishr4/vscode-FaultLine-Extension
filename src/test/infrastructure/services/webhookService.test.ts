import { isPrivateHost } from '../../../infrastructure/services/webhookService';

describe('WebhookService SSRF', () => {
    it('detects private IPs correctly', () => {
        expect(isPrivateHost('127.0.0.1')).toBe(true);
        expect(isPrivateHost('10.0.0.1')).toBe(true);
        expect(isPrivateHost('192.168.1.1')).toBe(true);
        expect(isPrivateHost('8.8.8.8')).toBe(false);
    });
});
