import * as vscode from 'vscode';

interface WhatsNewMessage {
    command: 'openSettings' | 'test' | 'openChangelog' | 'close';
}

/**
 * Generates a random nonce for CSP.
 */
function generateNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

/**
 * Manages the "What's New in FaultLine" update changelog webview panel.
 * Provides a clean, modern overview of the latest features and fixes whenever the extension updates.
 */
export class WhatsNewPanel {
    public static currentPanel: WhatsNewPanel | null = null;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, version: string): void {
        try {
            const column = vscode.window.activeTextEditor
                ? vscode.window.activeTextEditor.viewColumn
                : undefined;

            if (WhatsNewPanel.currentPanel) {
                WhatsNewPanel.currentPanel._panel.reveal(column);
                return;
            }

            const panel = vscode.window.createWebviewPanel(
                'faultlineWhatsNew',
                `What's New in FaultLine v${version}`,
                column ?? vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources')]
                }
            );

            WhatsNewPanel.currentPanel = new WhatsNewPanel(panel, extensionUri, version);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[FaultLine] What\'s New panel failed:', err);
            void vscode.window.showErrorMessage(`FaultLine: could not open What's New (${msg}).`);
        }
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        version: string
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this.getHtmlForWebview(this._panel.webview, extensionUri, version);

        this._panel.webview.onDidReceiveMessage(
            (message: WhatsNewMessage) => {
                void this.handleWebviewMessage(message);
            },
            null,
            this._disposables
        );
    }

    private async handleWebviewMessage(message: WhatsNewMessage): Promise<void> {
        if (!message || typeof message.command !== 'string') {
            return;
        }

        switch (message.command) {
            case 'openSettings':
                await vscode.commands.executeCommand('faultline.openSettings');
                return;
            case 'test':
                await vscode.commands.executeCommand('faultline.test');
                return;
            case 'openChangelog': {
                try {
                    const fileUri = vscode.Uri.joinPath(this._extensionUri, 'CHANGELOG.md');
                    const doc = await vscode.workspace.openTextDocument(fileUri);
                    await vscode.window.showTextDocument(doc);
                } catch {
                    void vscode.env.openExternal(vscode.Uri.parse('https://github.com/4nur4gmishr4/vscode-FaultLine-Extension/blob/main/CHANGELOG.md'));
                }
                return;
            }
            case 'close':
                this.dispose();
                return;
        }
    }

    public dispose(): void {
        WhatsNewPanel.currentPanel = null;
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d) {
                d.dispose();
            }
        }
    }

    private getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri, version: string): string {
        const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'resources', 'faultline-logo.png')).toString();
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'resources', 'vendor', 'codicons', 'dist', 'codicon.css')).toString();
        const nonce = generateNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; img-src ${webview.cspSource}; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
    <link href="${codiconsUri}" rel="stylesheet" />
    <title>What's New in FaultLine</title>
    <style>
        :root {
            --bg: var(--vscode-editor-background, #121212);
            --card-bg: var(--vscode-editorWidget-background, #1e1e1e);
            --fg: var(--vscode-editor-foreground, #e0e0e0);
            --accent: var(--vscode-button-background, #0e639c);
            --accent-fg: var(--vscode-button-foreground, #ffffff);
            --border: var(--vscode-widget-border, #2d2d2d);
            --muted: var(--vscode-descriptionForeground, #8a8a8a);
            --badge-bg: var(--vscode-badge-background, #4d4d4d);
            --badge-fg: var(--vscode-badge-foreground, #ffffff);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: var(--bg);
            color: var(--fg);
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
            font-size: var(--vscode-font-size, 14px);
            line-height: 1.6;
            padding: 32px 24px;
            max-width: 820px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            align-items: center;
            gap: 18px;
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--border);
        }
        .logo {
            width: 54px;
            height: 54px;
            border-radius: 12px;
            object-fit: cover;
            border: 1px solid var(--border);
        }
        .title-group h1 {
            font-size: 24px;
            font-weight: 600;
            color: var(--fg);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .badge {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 3px 8px;
            border-radius: 999px;
            background: var(--accent);
            color: var(--accent-fg);
            letter-spacing: 0.5px;
        }
        .subtitle {
            color: var(--muted);
            font-size: 14px;
            margin-top: 4px;
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
            margin-bottom: 28px;
        }
        .card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px 20px;
            transition: border-color 0.15s ease;
        }
        .card:hover {
            border-color: var(--accent);
        }
        .card-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        }
        .card-icon {
            font-size: 18px;
            color: var(--accent);
        }
        .card-title {
            font-size: 15px;
            font-weight: 600;
            color: var(--fg);
        }
        .card-desc {
            color: var(--muted);
            font-size: 13px;
        }
        .card-desc strong {
            color: var(--fg);
        }
        .actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            padding-top: 16px;
            border-top: 1px solid var(--border);
        }
        button {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 500;
            border-radius: 4px;
            cursor: pointer;
            border: none;
            background: var(--accent);
            color: var(--accent-fg);
            transition: opacity 0.15s ease;
        }
        button:hover { opacity: 0.9; }
        button.secondary {
            background: var(--card-bg);
            color: var(--fg);
            border: 1px solid var(--border);
        }
        button.secondary:hover {
            border-color: var(--fg);
        }
    </style>
</head>
<body>
    <div class="header">
        <img src="${logoUri}" alt="FaultLine" class="logo" />
        <div class="title-group">
            <h1>FaultLine <span class="badge">v${version}</span></h1>
            <p class="subtitle">Zero-bug forensic stability & cross-IDE architecture release.</p>
        </div>
    </div>

    <div class="grid">
        <div class="card">
            <div class="card-header">
                <span class="codicon codicon-globe card-icon"></span>
                <span class="card-title">Cross-IDE & Open VSX Ready</span>
            </div>
            <p class="card-desc">Seamless compatibility across <strong>VS Code, Cursor, Windsurf, Antigravity IDE, VSCodium</strong>, and Open VSX registries with unified packaging.</p>
        </div>

        <div class="card">
            <div class="card-header">
                <span class="codicon codicon-sparkle card-icon"></span>
                <span class="card-title">Dynamic Multi-Provider AI Engine</span>
            </div>
            <p class="card-desc">Effortlessly switch between <strong>Google Gemini, OpenAI, Groq, Anthropic</strong>, and <strong>Copilot</strong>. FaultLine dynamically aligns provider default models with zero 404 mismatch crashes.</p>
        </div>

        <div class="card">
            <div class="card-header">
                <span class="codicon codicon-shield card-icon"></span>
                <span class="card-title">Enterprise-Grade Audio & WSH Fallback</span>
            </div>
            <p class="card-desc">Windows Script Host disabled on corporate machines? FaultLine automatically falls back to <strong>PowerShell MediaPlayer</strong> with zero silent drops. Accidental surrounding quotes in sound paths are automatically scrubbed.</p>
        </div>

        <div class="card">
            <div class="card-header">
                <span class="codicon codicon-pulse card-icon"></span>
                <span class="card-title">Smart Active-Typing Cooldown & Batching</span>
            </div>
            <p class="card-desc">Diagnostics no longer storm sound effects mid-keystroke. Error changes across multiple files are accumulated and safely debounced.</p>
        </div>

        <div class="card">
            <div class="card-header">
                <span class="codicon codicon-terminal card-icon"></span>
                <span class="card-title">Terminal Drain Safeguard & ANSI Sanitization</span>
            </div>
            <p class="card-desc">Terminal buffers feature a 1500ms safety drain race to prevent subshell stream hangs, while raw ANSI escape sequences are completely stripped from error prompts.</p>
        </div>

        <div class="card">
            <div class="card-header">
                <span class="codicon codicon-history card-icon"></span>
                <span class="card-title">Accurate Snooze Indicator & Jira Cloud ADF</span>
            </div>
            <p class="card-desc">Status bar explicitly displays <strong>$(history) Snoozed</strong> when quiet hours or snooze is active. Webhooks emit strict Atlassian Document Format (ADF) multi-paragraph issue payloads.</p>
        </div>
    </div>

    <div class="actions">
        <button id="btnSettings"><span class="codicon codicon-gear"></span> Open Configuration</button>
        <button id="btnTest" class="secondary"><span class="codicon codicon-play"></span> Test Sound</button>
        <button id="btnChangelog" class="secondary"><span class="codicon codicon-book"></span> View Full Changelog</button>
        <button id="btnClose" class="secondary">Dismiss</button>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        document.getElementById('btnSettings').addEventListener('click', () => {
            vscode.postMessage({ command: 'openSettings' });
        });
        document.getElementById('btnTest').addEventListener('click', () => {
            vscode.postMessage({ command: 'test' });
        });
        document.getElementById('btnChangelog').addEventListener('click', () => {
            vscode.postMessage({ command: 'openChangelog' });
        });
        document.getElementById('btnClose').addEventListener('click', () => {
            vscode.postMessage({ command: 'close' });
        });
    </script>
</body>
</html>`;
    }
}
