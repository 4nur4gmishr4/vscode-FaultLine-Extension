import { sanitizePII, containsPII, getDetectedPIITypes } from '../../../infrastructure/security/pii';

describe('PII expanded', () => {
    it('redacts vendor API keys', () => {
        expect(sanitizePII('sk-or-v1-abcdefghijklmnopqrstuvwxyz')).toContain('[OPENROUTER_KEY]');
        expect(sanitizePII('sk-ant-abcdefghijklmnopqrstuvwxyz')).toContain('[ANTHROPIC_KEY]');
        expect(sanitizePII('sk-abcdefghijklmnopqrstuvwxyz12')).toContain('[API_KEY]');
        expect(sanitizePII('gsk_' + 'a'.repeat(40))).toContain('[GROQ_KEY]');
        expect(sanitizePII('AIza' + 'a'.repeat(35))).toContain('[GOOGLE_KEY]');
        expect(sanitizePII('hf_' + 'a'.repeat(30))).toContain('[HUGGINGFACE_KEY]');
        expect(sanitizePII('AKIA' + 'A'.repeat(16))).toContain('[AWS_KEY]');
    });

    it('redacts URL credentials and password fields', () => {
        expect(sanitizePII('https://user:secret@host/path')).toContain('[REDACTED]');
        expect(sanitizePII('password=supersecret')).toContain('[REDACTED]');
        expect(sanitizePII('token: abcdefghijklmnop')).toContain('[REDACTED]');
    });

    it('does not redact plain commit SHAs as base64', () => {
        const sha = 'a'.repeat(40);
        expect(sanitizePII(`commit ${sha}`)).toContain(sha);
    });

    it('redacts mixed-case long base64 secrets', () => {
        // 40+ mixed-class chars so looksLikeBase64Secret accepts the match
        const secret = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcd+/==';
        expect(sanitizePII(secret)).toContain('[BASE64]');
    });

    it('containsPII and getDetectedPIITypes agree', () => {
        const text = 'email me@x.com with sk-abcdefghijklmnopqrstuvwxyz12';
        expect(containsPII(text)).toBe(true);
        const types = getDetectedPIITypes(text);
        expect(types).toEqual(expect.arrayContaining(['EMAIL', 'OPENAI_KEY']));
    });

    it('truncates extremely long input before scan', () => {
        const huge = 'a'.repeat(120_000) + ' admin@example.com';
        // Truncation drops the email past the scan window
        const out = sanitizePII(huge);
        expect(out.length).toBeLessThanOrEqual(100_000);
    });
});
