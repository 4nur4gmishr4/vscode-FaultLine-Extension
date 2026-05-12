/**
 * Tests for constants module
 */

import {
    EXTENSION,
    CONFIG,
    SOUNDS,
    DEFAULTS,
    VALIDATION,
    RESOURCES,
    WEBVIEW_PANELS
} from './constants';

describe('Constants Module', () => {
    describe('EXTENSION', () => {
        it('should have correct extension metadata', () => {
            expect(EXTENSION.ID).toBe('fahh');
            expect(EXTENSION.NAME).toBe('Fahh');
            expect(EXTENSION.VERSION).toBe('2.4.0');
            expect(EXTENSION.PUBLISHER).toBe('4nur4gmishr4');
        });
    });

    describe('CONFIG', () => {
        it('should have correct configuration section', () => {
            expect(CONFIG.SECTION).toBe('fahh');
        });

        it('should have all required configuration keys', () => {
            expect(CONFIG.KEYS.ENABLED).toBe('enabled');
            expect(CONFIG.KEYS.SOUND_PACK).toBe('soundPack');
            expect(CONFIG.KEYS.AI_PROVIDER).toBe('aiProvider');
        });
    });

    describe('SOUNDS', () => {
        it('should have default sound path', () => {
            expect(SOUNDS.DEFAULT).toBe('packs/default/fahh.mp3');
        });

        it('should have all sound pack names', () => {
            expect(SOUNDS.PACKS.FAHH).toBe('fahh.mp3');
            expect(SOUNDS.PACKS.FAHH_HARD).toBe('fahhhard.mp3');
            expect(SOUNDS.PACKS.OH_SHIT).toBe('ohshit.mp3');
        });
    });

    describe('DEFAULTS', () => {
        it('should have correct default values', () => {
            expect(DEFAULTS.ENABLED).toBe(true);
            expect(DEFAULTS.VOLUME).toBe(100);
            expect(DEFAULTS.SOUND_PACK).toBe('fahh.mp3');
            expect(DEFAULTS.AI_PROVIDER).toBe('copilot');
        });
    });

    describe('VALIDATION', () => {
        it('should have time format regex', () => {
            expect(VALIDATION.TIME_FORMAT).toBeInstanceOf(RegExp);
            expect(VALIDATION.TIME_FORMAT.test('22:00')).toBe(true);
            expect(VALIDATION.TIME_FORMAT.test('08:00')).toBe(true);
            expect(VALIDATION.TIME_FORMAT.test('25:00')).toBe(false);
        });

        it('should have volume range', () => {
            expect(VALIDATION.VOLUME.MIN).toBe(0);
            expect(VALIDATION.VOLUME.MAX).toBe(100);
            expect(VALIDATION.VOLUME.DEFAULT_PER_SOURCE).toBe(-1);
        });
    });

    describe('RESOURCES', () => {
        it('should declare extension-relative resource paths', () => {
            expect(RESOURCES.PACKS_DIR).toBe('resources/packs');
            expect(RESOURCES.DEFAULT_PACK).toBe('resources/packs/default');
            expect(RESOURCES.LOGO).toBe('resources/fahh-logo.jpeg');
        });
    });

    describe('WEBVIEW_PANELS', () => {
        it('should expose unique view-type ids per webview', () => {
            const ids = [WEBVIEW_PANELS.ERROR_EXPLANATION, WEBVIEW_PANELS.WELCOME, WEBVIEW_PANELS.AI_PROVIDER_WIZARD];
            expect(new Set(ids).size).toBe(ids.length);
            expect(WEBVIEW_PANELS.AI_PROVIDER_WIZARD).toBe('fahhAiProviderWizard');
        });
    });

    describe('Constants Availability', () => {
        it('should export all constant objects in use at runtime', () => {
            expect(EXTENSION).toBeDefined();
            expect(CONFIG).toBeDefined();
            expect(SOUNDS).toBeDefined();
            expect(DEFAULTS).toBeDefined();
            expect(VALIDATION).toBeDefined();
            expect(RESOURCES).toBeDefined();
            expect(WEBVIEW_PANELS).toBeDefined();
        });
    });
});
