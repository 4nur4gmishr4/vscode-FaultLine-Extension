import { sanitizePII } from '../../../infrastructure/security/pii';

describe('PII Sanitizer', () => {
    it('redacts email addresses', () => {
        expect(sanitizePII('contact admin@example.com now')).toBe('contact [EMAIL] now');
    });
    it('redacts bare JWTs', () => {
        const jwt =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        expect(sanitizePII(`auth ${jwt} done`)).toBe('auth [JWT] done');
    });
    it('redacts GitHub PATs', () => {
        expect(sanitizePII('export GH=ghp_abcdefghijklmnopqrstuvwxyz0123456789')).toContain('[GITHUB_TOKEN]');
    });
    it('redacts Azure AccountKey', () => {
        expect(sanitizePII('AccountKey=abcdefGHIJKLmnop0123456789+/==')).toBe('AccountKey=[AZURE_KEY]');
    });
    it('redacts PEM private keys', () => {
        const pem = [
            '-----BEGIN PRIVATE KEY-----',
            'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7',
            '-----END PRIVATE KEY-----'
        ].join('\n');
        expect(sanitizePII(`key:\n${pem}\nok`)).toBe('key:\n[PEM_PRIVATE_KEY]\nok');
    });
});
