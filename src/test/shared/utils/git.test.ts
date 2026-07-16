import { matchesBranchPattern } from '../../../shared/utils/git';

describe('matchesBranchPattern', () => {
    it('matches all when patterns empty', () => {
        expect(matchesBranchPattern('main', [])).toBe(true);
        expect(matchesBranchPattern('feature/x', [])).toBe(true);
    });

    it('matches exact and glob patterns', () => {
        expect(matchesBranchPattern('main', ['main'])).toBe(true);
        expect(matchesBranchPattern('develop', ['main'])).toBe(false);
        expect(matchesBranchPattern('feature/foo', ['feature/*'])).toBe(true);
        expect(matchesBranchPattern('release/1.0', ['release/*', 'main'])).toBe(true);
        expect(matchesBranchPattern('hotfix/x', ['feature/*'])).toBe(false);
    });
});
