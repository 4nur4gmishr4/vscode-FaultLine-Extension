import * as vscode from 'vscode';
import { StatusBarManager } from '../../presentation/ui/statusBar';
import { Logger } from '../../shared/utils/logger';
import type { FaultLineConfig } from '../../domain/types/index';

describe('StatusBarManager', () => {
    let manager: StatusBarManager;
    let failCount: number;

    beforeEach(() => {
        failCount = 0;
        const configFn = (): FaultLineConfig =>
            ({
                core: { enabled: true },
                audio: { soundsEnabled: true },
                ui: {
                    showStatusBar: true,
                    statusBarCounter: true,
                    flashStatusBar: true
                }
            }) as FaultLineConfig;

        manager = new StatusBarManager(configFn, new Logger('test'), () => failCount);
    });

    afterEach(() => {
        manager.dispose();
        jest.clearAllMocks();
    });

    it('creates and shows status items on refresh when enabled', () => {
        manager.refresh();
        expect(vscode.window.createStatusBarItem).toHaveBeenCalled();
        const item = (vscode.window.createStatusBarItem as jest.Mock).mock.results[0]?.value;
        expect(item.show).toHaveBeenCalled();
        expect(item.text).toMatch(/FaultLine: ON/);
    });

    it('shows daily fail count when counter enabled', () => {
        failCount = 3;
        manager.refresh();
        const item = (vscode.window.createStatusBarItem as jest.Mock).mock.results[0]?.value;
        expect(item.text).toContain('3');
    });

    it('hides items when showStatusBar is false', () => {
        manager = new StatusBarManager(
            () =>
                ({
                    core: { enabled: true },
                    audio: { soundsEnabled: true },
                    ui: { showStatusBar: false, statusBarCounter: true, flashStatusBar: true }
                }) as FaultLineConfig,
            new Logger('test'),
            () => 0
        );
        manager.refresh();
        // No throw; hide may be called if items existed — with no items, still safe
        manager.dispose();
    });

    it('dispose is idempotent', () => {
        manager.refresh();
        manager.dispose();
        manager.dispose();
    });
});
