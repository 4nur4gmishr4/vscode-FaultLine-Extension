/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as vscode from 'vscode';
import { FaultLineRuntime } from '../runtime/faultline';
import { HistoryEntry } from '../types';

export function registerHistoryCommands(ext: FaultLineRuntime, disposables: vscode.Disposable[]): void {
    disposables.push(
        vscode.commands.registerCommand('faultline.clearHistory', () => {
            ext.history.clear();
            void vscode.window.showInformationMessage('Failure history cleared.');
        }),

        vscode.commands.registerCommand('faultline.replaySound', async (entry?: HistoryEntry) => {
            const target = entry ?? ext.history.getLast();
            if (target?.soundPath) {
                try {
                    await vscode.workspace.fs.stat(vscode.Uri.file(target.soundPath));
                    void ext.player.play(target.soundPath, { volume: ext.configManager.readConfig().audio.volume });
                } catch {
                    void vscode.window.showWarningMessage('Sound file not found for this entry.');
                }
            } else {
                void vscode.window.showWarningMessage('No recent failure to replay.');
            }
        }),

        vscode.commands.registerCommand('faultline.showHistory', () => {
            void vscode.commands.executeCommand('faultline.history.focus');
        }),

        vscode.commands.registerCommand('faultline.exportHistoryCSV', async () => {
            const entries = ext.history.getAll();
            if (entries.length === 0) {
                void vscode.window.showInformationMessage('No history to export.');
                return;
            }
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('faultline_history.csv'),
                filters: { CSV: ['csv'] }
            });
            if (!uri) { return; }
            const header = 'Timestamp,Source,Label,SoundPath\n';
            const escapeCsv = (val: string) => {
                let escaped = val.replace(/"/g, '""');
                if (/^[=+\-@\t\r]/.test(escaped)) {
                    escaped = "'" + escaped;
                }
                return `"${escaped}"`;
            };
            const rows = entries.map((e: HistoryEntry) => 
                `${e.timestamp},${e.source},${escapeCsv(e.label)},${escapeCsv(e.soundPath ?? '')}`
            ).join('\n');
            const csv = header + rows;
            try {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(csv, 'utf8'));
                void vscode.window.showInformationMessage(`Exported ${entries.length} entries to CSV.`);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                void vscode.window.showErrorMessage(`Export failed: ${msg}`);
            }
        }),

        vscode.commands.registerCommand('faultline.exportHistoryJSON', async () => {
            const entries = ext.history.getAll();
            if (entries.length === 0) {
                void vscode.window.showInformationMessage('No history to export.');
                return;
            }
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('faultline_history.json'),
                filters: { JSON: ['json'] }
            });
            if (!uri) { return; }
            const json = JSON.stringify(entries, null, 2);
            try {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(json, 'utf8'));
                void vscode.window.showInformationMessage(`Exported ${entries.length} entries to JSON.`);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                void vscode.window.showErrorMessage(`Export failed: ${msg}`);
            }
        })
    );
}
