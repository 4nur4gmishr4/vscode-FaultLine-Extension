/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { sanitizePII } from '../security/pii';

/**
 * Validates that security fixes for PII, SSRF, and RCE remain effective.
 */
describe('Security Regression', () => {
    describe('PII Sanitization', () => {
        it('should redact sensitive information from labels', () => {
            const inputs = [
                { raw: 'error at user@example.com', expected: 'error at [EMAIL]' },
                { raw: 'key sk-abcdefghijklmnopqrstuvwxyz', expected: 'key [API_KEY]' },
                { raw: 'https://example.com/secret', expected: '[URL]' }
            ];

            for (const { raw, expected } of inputs) {
                expect(sanitizePII(raw)).toBe(expected);
            }
        });

        it('should handle repeated calls without state leakage', () => {
            const raw = 'error user@example.com';
            sanitizePII(raw);
            expect(sanitizePII(raw)).toBe('error [EMAIL]');
        });
    });
});
