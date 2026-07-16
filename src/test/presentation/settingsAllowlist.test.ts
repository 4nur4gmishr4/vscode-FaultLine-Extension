import { ALLOWED_SETTINGS_KEYS, filterAllowedConfig } from '../../presentation/ui/settingsPanel';

describe('Settings webview config allowlist', () => {
    it('keeps only known safe keys', () => {
        const filtered = filterAllowedConfig({
            enabled: true,
            volume: 50,
            soundsEnabled: false,
            showNotification: true,
            notificationLevel: 'warning',
            showStatusBar: true,
            flashStatusBar: false,
            statusBarCounter: true,
            'errorExplanation.enabled': true,
            'errorExplanation.autoShow': false,
            webhookUrl: 'https://evil.example.com',
            jiraApiKey: 'secret',
            'ai.model': 'gpt-4o',
            openrouterApiKey: 'sk-test'
        });

        expect(filtered).toEqual({
            enabled: true,
            volume: 50,
            soundsEnabled: false,
            showNotification: true,
            notificationLevel: 'warning',
            showStatusBar: true,
            flashStatusBar: false,
            statusBarCounter: true,
            'errorExplanation.enabled': true,
            'errorExplanation.autoShow': false,
            'ai.model': 'gpt-4o'
        });
        expect(filtered).not.toHaveProperty('webhookUrl');
        expect(filtered).not.toHaveProperty('jiraApiKey');
        expect(filtered).not.toHaveProperty('openrouterApiKey');
    });

    it('returns empty object for missing/empty config', () => {
        expect(filterAllowedConfig(undefined)).toEqual({});
        expect(filterAllowedConfig({})).toEqual({});
    });

    it('allowlist does not include secret or integration keys', () => {
        const forbidden = [
            'webhookUrl',
            'jiraUrl',
            'jiraEmail',
            'jiraApiKey',
            'openrouterApiKey',
            'githubToken'
        ];
        for (const key of forbidden) {
            expect(ALLOWED_SETTINGS_KEYS.has(key)).toBe(false);
        }
    });

    it('includes UI and privacy-critical keys', () => {
        for (const key of [
            'soundsEnabled',
            'showNotification',
            'errorExplanation.autoShow',
            'errorExplanation.enabled',
            'statusBarCounter',
            'language'
        ]) {
            expect(ALLOWED_SETTINGS_KEYS.has(key)).toBe(true);
        }
    });
});
