import * as vscode from 'vscode';
import { FahhConfig } from './config';
import { Logger } from './logger';

export interface HistoryEntry {
    id: string;
    timestamp: number;
    source: string;
    label: string;
    soundPath: string;
}

export class HistoryManager implements vscode.TreeDataProvider<HistoryItem> {
    private entries: HistoryEntry[] = [];
    private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<HistoryItem | undefined>();
    public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    public constructor(private readonly config: () => FahhConfig, private readonly logger: Logger) {}

    public getTreeItem(element: HistoryItem): vscode.TreeItem {
        return element;
    }

    public getChildren(element?: HistoryItem): HistoryItem[] {
        if (element) {
            return [];
        }
        return this.entries.map(e => new HistoryItem(e));
    }

    public add(entry: HistoryEntry): void {
        const max = this.config().historyMax;
        this.entries.unshift(entry);
        if (this.entries.length > max) {
            this.entries = this.entries.slice(0, max);
        }
        this.onDidChangeTreeDataEmitter.fire(undefined);
        this.logger.debug(`History added: ${entry.label}`);
    }

    public clear(): void {
        this.entries = [];
        this.onDidChangeTreeDataEmitter.fire(undefined);
        this.logger.info('History cleared.');
    }

    public getLast(): HistoryEntry | null {
        return this.entries[0] ?? null;
    }

    public getAll(): ReadonlyArray<HistoryEntry> {
        return this.entries;
    }

    public dispose(): void {
        this.onDidChangeTreeDataEmitter.dispose();
    }
}

class HistoryItem extends vscode.TreeItem {
    public constructor(public readonly entry: HistoryEntry) {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        super(`${time} — ${entry.label}`, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `${entry.source}: ${entry.label}\n${new Date(entry.timestamp).toLocaleString()}`;
        this.contextValue = 'fahh.historyEntry';
        this.command = {
            command: 'fahh.replayLast',
            title: 'Replay'
        };
    }
}
