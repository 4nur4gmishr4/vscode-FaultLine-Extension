import { sanitizePII } from '../../../infrastructure/security/pii';

describe('PII Sanitizer', () => {
    it('redacts email addresses', () => {
        expect(sanitizePII('contact admin@example.com now')).toBe('contact [EMAIL] now');
    });
    it('redacts JWT tokens', () => {
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiSFEiOiJJYW0ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        expect(sanitizePII(`token=${token}`)).toBe('token=[REDACTED]');
    });
});
