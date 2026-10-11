import * as vscode from 'vscode';
import { WelcomePanel } from '../../presentation/ui/welcome';
import { SettingsPanel } from '../../presentation/ui/settingsPanel';
import { WhatsNewPanel } from '../../presentation/ui/whatsNew';
import { ErrorExplanationManager } from '../../presentation/ui/errorExplanation';
import { Logger } from '../../shared/utils/logger';

describe('UI panels createOrShow safety', () => {
    const uri = vscode.Uri.file('/fake/extension');

    afterEach(() => {
        WelcomePanel.currentPanel?.dispose();
        SettingsPanel.currentPanel?.dispose();
        WhatsNewPanel.currentPanel?.dispose();
        jest.clearAllMocks();
    });

    it('WelcomePanel.createOrShow creates a webview', () => {
        WelcomePanel.createOrShow(uri, false);
        expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
        expect(WelcomePanel.currentPanel).toBeDefined();
        WelcomePanel.createOrShow(uri, false); // reveal path
    });

    it('WelcomePanel.createOrShow surfaces errors', () => {
        (vscode.window.createWebviewPanel as jest.Mock).mockImplementationOnce(() => {
            throw new Error('panel fail');
        });
        WelcomePanel.createOrShow(uri, true);
        expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    it('WhatsNewPanel.createOrShow creates webview and handles reveals', () => {
        WhatsNewPanel.createOrShow(uri, '3.5.1');
        expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
        expect(WhatsNewPanel.currentPanel).toBeDefined();
        WhatsNewPanel.createOrShow(uri, '3.5.1'); // reveal path
    });

    it('WhatsNewPanel.createOrShow surfaces errors', () => {
        (vscode.window.createWebviewPanel as jest.Mock).mockImplementationOnce(() => {
            throw new Error('whats new fail');
        });
        WhatsNewPanel.createOrShow(uri, '3.5.1');
        expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    it('SettingsPanel.createOrShow creates a webview', () => {
        const configManager = {
            readConfig: jest.fn(() => ({
                core: { enabled: true },
                audio: {
                    volume: 50,
                    soundPack: 'faultline.mp3',
                    successEnabled: false,
                    successSound: 'success_ding.mp3',
                    soundsEnabled: true
                },
                ai: {
                    provider: 'copilot',
                    model: 'default',
                    summaryEnabled: false,
                    errorExplanationEnabled: true,
                    errorExplanationAutoShow: false
                },
                ui: {
                    showNotification: true,
                    notificationLevel: 'error',
                    showStatusBar: true,
                    flashStatusBar: true,
                    statusBarCounter: true
                }
            }))
        };
        const secretManager = {};
        const logger = new Logger('t');
        SettingsPanel.createOrShow(uri, configManager as never, secretManager as never, logger);
        expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
        SettingsPanel.createOrShow(uri, configManager as never, secretManager as never, logger, 'section-ai');
    });

    it('ErrorExplanationManager shows failure safely', () => {
        const mgr = new ErrorExplanationManager(
            new Logger('t'),
            { getAiExplanation: jest.fn(), getAiChat: jest.fn() } as never,
            uri
        );
        mgr.showFailureExplanation({
            source: 'task',
            label: 'build failed',
            timestamp: Date.now()
        });
        expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
        mgr.dispose();
    });
});
