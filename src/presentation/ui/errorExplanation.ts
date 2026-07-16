import * as vscode from 'vscode';
import { Logger } from '../../shared/utils/logger';
import { AIService } from '../../infrastructure/services/aiService';
import type { FailureEvent, FailureSource } from '../../domain/types/index';

const MAX_FAILURE_LABEL = 2_000;
const MAX_FAILURE_OUTPUT = 10_000;
const MAX_CHAT_HISTORY = 20_000;
const MAX_CHAT_TEXT = 4_000;
const MAX_CLIPBOARD = 20_000;

const FAILURE_SOURCES = new Set<string>([
    'task', 'shell', 'terminal', 'diagnostics'
]);

/** Exported for unit tests — clamp untrusted webview/AI strings. */
export function clampStr(value: unknown, max: number): string {
    if (typeof value !== 'string') {
        return '';
    }
    return value.length > max ? value.slice(0, max) : value;
}

/** Exported for unit tests — schema-check failure payloads from the webview. */
export function parseFailureEvent(raw: unknown): FailureEvent | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const o = raw as Record<string, unknown>;
    const source = typeof o.source === 'string' && FAILURE_SOURCES.has(o.source)
        ? (o.source as FailureSource)
        : 'shell';
    const label = clampStr(o.label, MAX_FAILURE_LABEL) || 'Unknown failure';
    const outputRaw = o.output;
    const output = outputRaw === undefined || outputRaw === null
        ? undefined
        : clampStr(outputRaw, MAX_FAILURE_OUTPUT) || undefined;
    const timestamp = typeof o.timestamp === 'number' && Number.isFinite(o.timestamp)
        ? o.timestamp
        : Date.now();
    return { source, label, output, timestamp };
}

/**
 * Manages the error explanation webview panel.
 * 
 * Provides a user interface for displaying AI-generated explanations of
 * build failures and terminal errors using native VS Code styling.
 */
export class ErrorExplanationManager {
    public static readonly viewType = 'faultlineErrorExplanation';
    private panel: vscode.WebviewPanel | undefined;
    private disposables: vscode.Disposable[] = [];
    private pendingFailures: FailureEvent[] = [];
    private disposed = false;

    constructor(
        private readonly logger: Logger,
        private readonly aiService: AIService,
        private readonly extensionUri: vscode.Uri
    ) {}

    public showFailureExplanation(failure: FailureEvent): void {
        if (this.disposed) {
            return;
        }
        try {
            const safe = parseFailureEvent(failure) ?? {
                source: 'shell' as const,
                label: 'Unknown failure',
                timestamp: Date.now()
            };
            if (!this.panel) {
                this.pendingFailures.push(safe);
                this.createPanel();
            } else {
                this.panel.reveal();
                this.sendFailureToWebview(safe);
            }
        } catch (err) {
            this.logger.error('Failed to show failure explanation', err);
            void vscode.window.showErrorMessage(
                `FaultLine: could not open error analysis (${err instanceof Error ? err.message : String(err)}).`
            );
        }
    }

    private createPanel(): void {
        this.panel = vscode.window.createWebviewPanel(
            ErrorExplanationManager.viewType,
            'FaultLine Error Analysis',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.extensionUri, 'resources')
                ]
            }
        );

        this.panel.webview.html = this.getWebviewContent(this.panel.webview);
        this.setupWebviewMessageHandlers();

        this.panel.onDidDispose(() => {
            this.panel = undefined;
            this.disposables.forEach(d => { d.dispose(); });
            this.disposables = [];
        });
    }

    private setupWebviewMessageHandlers(): void {
        if (!this.panel) return;

        this.panel.webview.onDidReceiveMessage(
            async (message: unknown) => {
                try {
                    if (!message || typeof message !== 'object') {
                        return;
                    }
                    const msg = message as Record<string, unknown>;
                    const command = typeof msg.command === 'string' ? msg.command : '';
                    switch (command) {
                        case 'explainError': {
                            const failure = parseFailureEvent(msg.failure);
                            if (failure) {
                                await this.explainError(failure);
                            }
                            return;
                        }
                        case 'chatMessage':
                            await this.handleChatMessage(
                                clampStr(msg.history, MAX_CHAT_HISTORY),
                                clampStr(msg.text, MAX_CHAT_TEXT)
                            );
                            return;
                        case 'ready':
                            this.pendingFailures.forEach(f => this.sendFailureToWebview(f));
                            this.pendingFailures = [];
                            return;
                        case 'copyError': {
                            const text = clampStr(msg.errorText, MAX_CLIPBOARD);
                            if (text) {
                                await vscode.env.clipboard.writeText(text);
                                void vscode.window.showInformationMessage('Error copied to clipboard');
                            }
                            return;
                        }
                        case 'showWelcome':
                            void vscode.commands.executeCommand('faultline.showWelcome');
                            return;
                        default:
                            return;
                    }
                } catch (err) {
                    this.logger.error('Error explanation webview message failed', err);
                }
            },
            undefined,
            this.disposables
        );
    }

    private sendFailureToWebview(failure: FailureEvent): void {
        if (this.panel) {
            void this.panel.webview.postMessage({
                command: 'showFailure',
                failure: failure
            });
        }
    }

    private async explainError(failure: FailureEvent): Promise<void> {
        if (!this.panel || this.disposed) return;

        try {
            void this.panel.webview.postMessage({ command: 'explanationLoading' });
            const label = clampStr(failure.label, MAX_FAILURE_LABEL);
            const output = failure.output ? clampStr(failure.output, MAX_FAILURE_OUTPUT) : '';
            const promptText = output
                ? `Command: ${label}\n\nTerminal Output:\n${output}`
                : label;
            const explanation = await this.aiService.getAiExplanation(promptText);
            
            if (this.panel) {
                if (explanation) {
                    void this.panel.webview.postMessage({
                        command: 'explanationReady',
                        explanation: explanation
                    });
                } else {
                    void this.panel.webview.postMessage({
                        command: 'explanationError',
                        error: 'AI explanation unavailable. Please check your AI provider settings.'
                    });
                }
            }
        } catch (error) {
            this.logger.error('Error getting AI explanation', error);
            if (this.panel) {
                void this.panel.webview.postMessage({
                    command: 'explanationError',
                    error: 'Failed to connect to AI provider.'
                });
            }
        }
    }

    private async handleChatMessage(historyText: string, newText: string): Promise<void> {
        if (!this.panel || this.disposed) return;
        if (!newText.trim()) return;
        try {
            const history = clampStr(historyText, MAX_CHAT_HISTORY);
            const text = clampStr(newText, MAX_CHAT_TEXT);
            const prompt = history + `\n\nUser: ${text}\n(Context: Answer this follow-up question strictly in the context of the terminal error and debugging session above. You are a coding assistant.)\n\nAI:`;
            const reply = await this.aiService.getAiChat(prompt);
            if (this.panel) {
                if (reply) {
                    void this.panel.webview.postMessage({
                        command: 'chatReply',
                        reply: reply
                    });
                } else {
                    void this.panel.webview.postMessage({
                        command: 'chatError',
                        error: 'AI did not respond. Check your provider settings.'
                    });
                }
            }
        } catch (error) {
            if (this.panel) {
                void this.panel.webview.postMessage({
                    command: 'chatError',
                    error: 'Failed to connect to AI provider.'
                });
            }
        }
    }

    /* istanbul ignore next -- large static webview HTML shell */
    private getWebviewContent(webview: vscode.Webview): string {
        const nonce = this.getNonce();
        const toolkitUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'vendor', 'webview-ui-toolkit', 'dist', 'toolkit.min.js')).toString();
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'vendor', 'codicons', 'dist', 'codicon.css')).toString();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <link href="${codiconsUri}" rel="stylesheet" />
    <title>FaultLine Error Analysis</title>
    <style>
        body {
            padding: 20px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            line-height: 1.6;
        }
        .incident-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 4px;
            padding: 16px;
            margin-bottom: 24px;
        }
        .error-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
            color: var(--vscode-errorForeground);
        }
        .source-badge {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .error-text {
            background: var(--vscode-textCodeBlock-background);
            padding: 12px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            white-space: pre-wrap;
            word-break: break-all;
            margin: 12px 0;
            border-left: 4px solid var(--vscode-errorForeground);
        }
        .analysis-section {
            border-top: 1px solid var(--vscode-divider);
            padding-top: 20px;
            margin-top: 20px;
        }
        .ai-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: bold;
            margin-bottom: 12px;
        }
        .explanation-text {
            color: var(--vscode-foreground);
        }
        .loading-state {
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--vscode-descriptionForeground);
        }
        vscode-button {
            cursor: pointer;
            margin-right: 8px;
        }
        .chat-container {
            margin-top: 20px;
            display: none;
        }
        .chat-message {
            margin-bottom: 12px;
            padding: 12px;
            border-radius: 6px;
        }
        .chat-message.user {
            background: var(--vscode-editor-inactiveSelectionBackground);
            margin-left: 20px;
        }
        .chat-message.ai {
            background: var(--vscode-editor-selectionBackground);
            margin-right: 20px;
        }
        .chat-input-row {
            display: flex;
            gap: 10px;
            margin-top: 15px;
            align-items: stretch;
        }
        textarea.vscode-input {
            flex-grow: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px;
            font-family: var(--vscode-font-family);
            border-radius: 2px;
            resize: vertical;
        }
        textarea.vscode-input:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }
        .footer {
            margin-top: 40px;
            font-size: 11px;
            opacity: 0.6;
        }
    </style>
</head>
<body>
    <div id="content">
        <div class="loading-state">
            <vscode-progress-ring></vscode-progress-ring>
            <span>Waiting for failure data...</span>
        </div>
    </div>

    <script type="module" nonce="${nonce}" src="${toolkitUri}"></script>
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        let currentFailure = null;



        function renderFailure(failure) {
            currentFailure = failure;
            const container = document.getElementById('content');
            const displayError = failure.output ? \`Command: \${failure.label}\\n\\nTerminal Output:\\n\${failure.output}\` : failure.label;
            container.innerHTML = \`
                <div class="incident-card" role="alert" aria-live="assertive">
                    <div class="error-header">
                        <span class="codicon codicon-error"></span>
                        <h2 style="margin:0; font-size: 1.2em;">Failure Detected</h2>
                        <span class="source-badge">\${escapeHtml(failure.source)}</span>
                    </div>
                    <div class="error-text">\${escapeHtml(displayError)}</div>
                    <div style="font-size: 0.9em; opacity: 0.7; margin-bottom: 16px;">
                        \${new Date(failure.timestamp).toLocaleString()}
                    </div>
                    <div>
                        <vscode-button id="explainBtn" appearance="primary">
                            <span slot="start" class="codicon codicon-sparkle"></span>
                            AI Analysis
                        </vscode-button>
                        <vscode-button id="copyBtn" appearance="secondary">
                            Copy Error
                        </vscode-button>
                        <vscode-button id="welcomeBtn" appearance="secondary">
                            <span slot="start" class="codicon codicon-home"></span>
                            Welcome Screen
                        </vscode-button>
                    </div>
                </div>
                <div id="analysis-container"></div>
                <div id="chat-container" class="chat-container">
                    <div id="chat-messages"></div>
                    <div class="chat-input-row">
                        <textarea id="chatInput" class="vscode-input" placeholder="Ask a follow-up question... (Shift+Enter for newline)" rows="3"></textarea>
                        <vscode-button id="sendChatBtn" appearance="primary">Send</vscode-button>
                    </div>
                </div>
            \`;

            document.getElementById('explainBtn').addEventListener('click', () => {
                vscode.postMessage({ command: 'explainError', failure: currentFailure });
            });
            document.getElementById('copyBtn').addEventListener('click', () => {
                const fullText = failure.output ? \`Command: \${failure.label}\\n\\nTerminal Output:\\n\${failure.output}\` : failure.label;
                vscode.postMessage({ command: 'copyError', errorText: fullText });
            });
            document.getElementById('welcomeBtn').addEventListener('click', () => {
                vscode.postMessage({ command: 'showWelcome' });
            });
        }

        function renderLoading() {
            const container = document.getElementById('analysis-container');
            container.innerHTML = \`
                <div class="analysis-section">
                    <div class="loading-state">
                        <vscode-progress-ring></vscode-progress-ring>
                        <span>AI Assistant is analyzing the error...</span>
                    </div>
                </div>
            \`;
        }

        function renderExplanation(text) {
            const container = document.getElementById('analysis-container');
            container.innerHTML = \`
                <div class="analysis-section" role="region" aria-label="AI Analysis">
                    <div class="ai-title">
                        <span class="codicon codicon-hubot"></span>
                        AI Explanation
                    </div>
                    <div class="explanation-text">\${escapeHtml(text)}</div>
                </div>
            \`;
        }

        function renderError(err) {
            const container = document.getElementById('analysis-container');
            container.innerHTML = \`
                <div class="analysis-section">
                    <div style="color: var(--vscode-errorForeground);">
                        <span class="codicon codicon-warning"></span> \${escapeHtml(err)}
                    </div>
                </div>
            \`;
        }

        let fullConversation = '';

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'showFailure':
                    renderFailure(message.failure);
                    break;
                case 'explanationLoading':
                    renderLoading();
                    break;
                case 'explanationReady':
                    fullConversation = \`User: You are an expert developer assistant. A VS Code terminal command or build task just failed.\\n\\nError:\\n\${currentFailure.output ? \`Command: \${currentFailure.label}\\n\\nTerminal Output:\\n\${currentFailure.output}\` : currentFailure.label}\\n\\nPlease explain:\\n1. What caused this error\\n2. How to fix it\\n3. Any relevant tips.\\n\\nBe concise and practical. Use plain text, no markdown headers.\\n\\nAI: \${message.explanation}\`;
                    renderExplanation(message.explanation);
                    document.getElementById('chat-container').style.display = 'block';
                    setupChat();
                    break;
                case 'explanationError':
                    renderError(message.error);
                    break;
                case 'chatReply':
                    fullConversation += \`\\n\\nAI: \${message.reply}\`;
                    appendChatMessage('ai', message.reply);
                    enableChat();
                    break;
                case 'chatError':
                    appendChatMessage('error', message.error);
                    enableChat();
                    break;
            }
        });

        function setupChat() {
            const btn = document.getElementById('sendChatBtn');
            const input = document.getElementById('chatInput');
            
            const send = () => {
                const text = input.value.trim();
                if (!text) return;
                input.value = '';
                disableChat();
                fullConversation += \`\\n\\nUser: \${text}\`;
                appendChatMessage('user', text);
                vscode.postMessage({ command: 'chatMessage', history: fullConversation, text: text });
            };

            btn.addEventListener('click', send);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                }
            });
        }

        function appendChatMessage(role, text) {
            const container = document.getElementById('chat-messages');
            const msgDiv = document.createElement('div');
            msgDiv.className = \`chat-message \${role}\`;
            if (role === 'error') {
                msgDiv.style.color = 'var(--vscode-errorForeground)';
            }
            
            const icon = role === 'ai' ? '<span class="codicon codicon-hubot"></span> ' : 
                         role === 'user' ? '<span class="codicon codicon-account"></span> ' : 
                         '<span class="codicon codicon-warning"></span> ';
                         
            msgDiv.innerHTML = \`<div style="font-weight:bold;margin-bottom:4px;">\${icon} \${role === 'ai' ? 'AI' : role === 'user' ? 'You' : 'Error'}</div><div style="white-space: pre-wrap; word-break: break-all;">\${escapeHtml(text)}</div>\`;
            container.appendChild(msgDiv);
            container.scrollTop = container.scrollHeight;
        }

        function disableChat() {
            document.getElementById('sendChatBtn').disabled = true;
            document.getElementById('chatInput').disabled = true;
            appendChatMessage('ai', '...');
            document.getElementById('chat-messages').lastChild.id = 'typing-indicator';
        }

        function enableChat() {
            const typing = document.getElementById('typing-indicator');
            if (typing) typing.remove();
            document.getElementById('sendChatBtn').disabled = false;
            document.getElementById('chatInput').disabled = false;
            document.getElementById('chatInput').focus();
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        vscode.postMessage({ command: 'ready' });
    </script>
</body>
</html>`;
    }

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.pendingFailures = [];
        this.panel?.dispose();
        this.panel = undefined;
        this.disposables.forEach(d => { d.dispose(); });
        this.disposables = [];
    }
}
