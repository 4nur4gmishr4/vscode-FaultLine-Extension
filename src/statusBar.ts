import * as vscode from 'vscode';
import { FahhConfig } from './config';
import { Logger } from './logger';

export class StatusBarManager {
    private item: vscode.StatusBarItem | null = null;
    private failCountToday = 0;
    private flashing = false;

    public constructor(private readonly config: () => FahhConfig, _logger: Logger) {}

    public dispose(): void {
        this.item?.dispose();
        this.item = null;
    }

    public refresh(): void {
        const cfg = this.config();
        if (!cfg.showStatusBar) {
            this.item?.hide();
            return;
        }
        if (!this.item) {
            this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
            this.item.command = 'fahh.toggle';
        }

        const enabled = cfg.enabled;
        const counter = cfg.statusBarCounter ? ` • ${this.failCountToday}` : '';
        this.item.text = enabled ? `$(unmute) Fahh${counter}` : `$(mute) Fahh${counter}`;
        this.item.tooltip = enabled
            ? 'Fahh is enabled — click to disable'
            : 'Fahh is disabled — click to enable';
        this.item.show();
    }

    public incrementCounter(): void {
        this.failCountToday++;
        this.refresh();
    }

    public resetCounter(): void {
        this.failCountToday = 0;
        this.refresh();
    }

    public flash(): void {
        const cfg = this.config();
        if (!cfg.flashStatusBar || !this.item) {
            return;
        }
        if (this.flashing) {
            return;
        }
        this.flashing = true;
        const original = this.item.backgroundColor;
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        setTimeout(() => {
            if (this.item) {
                this.item.backgroundColor = original;
            }
            this.flashing = false;
        }, 1000);
    }

    public getFailCount(): number {
        return this.failCountToday;
    }
}
