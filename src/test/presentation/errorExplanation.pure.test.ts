import { clampStr, parseFailureEvent } from '../../presentation/ui/errorExplanation';

describe('errorExplanation pure helpers', () => {
    it('clampStr truncates and rejects non-strings', () => {
        expect(clampStr('hello', 3)).toBe('hel');
        expect(clampStr(null, 10)).toBe('');
        expect(clampStr(42, 10)).toBe('');
        expect(clampStr('short', 100)).toBe('short');
    });

    it('parseFailureEvent accepts valid payloads', () => {
        const ev = parseFailureEvent({
            source: 'task',
            label: 'npm test',
            output: 'failed',
            timestamp: 123
        });
        expect(ev).toEqual({
            source: 'task',
            label: 'npm test',
            output: 'failed',
            timestamp: 123
        });
    });

    it('parseFailureEvent defaults invalid source and empty label', () => {
        const ev = parseFailureEvent({ source: 'nope', label: '' });
        expect(ev?.source).toBe('shell');
        expect(ev?.label).toBe('Unknown failure');
        expect(ev?.timestamp).toBeGreaterThan(0);
    });

    it('parseFailureEvent returns null for non-objects', () => {
        expect(parseFailureEvent(null)).toBeNull();
        expect(parseFailureEvent('x')).toBeNull();
    });
});
