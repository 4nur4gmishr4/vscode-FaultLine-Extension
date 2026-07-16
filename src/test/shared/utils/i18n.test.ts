import { getSupportedLanguages, isLanguageSupported, setLanguage, t } from '../../../shared/utils/i18n';

describe('i18n', () => {
    afterEach(() => {
        setLanguage('en');
    });

    it('lists supported languages and validates codes', () => {
        const langs = getSupportedLanguages();
        expect(langs).toContain('en');
        expect(isLanguageSupported('en')).toBe(true);
        expect(isLanguageSupported('zz')).toBe(false);
    });

    it('returns English strings and interpolates params', () => {
        setLanguage('en');
        expect(t('toggledOn')).toMatch(/enabled/i);
        expect(t('snoozed', { minutes: 10 })).toContain('10');
        expect(t('soundPackSelected', { name: 'Classic' })).toContain('Classic');
    });

    it('falls back to English for missing keys in other languages', () => {
        setLanguage('es');
        // New keys may only exist in en — still resolve via fallback
        expect(t('factoryResetDone').length).toBeGreaterThan(0);
        expect(t('toggledOn').length).toBeGreaterThan(0);
    });
});
