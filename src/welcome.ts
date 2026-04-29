import * as vscode from 'vscode';
import * as path from 'path';

export class WelcomePanel {
    public static currentPanel: WelcomePanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (WelcomePanel.currentPanel) {
            WelcomePanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'fahhWelcome',
            'Welcome to Fahh!',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(extensionUri.fsPath, 'media'))]
            }
        );

        WelcomePanel.currentPanel = new WelcomePanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, extensionUri);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'test':
                        vscode.commands.executeCommand('fahh.test');
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        WelcomePanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
        const logoPath = webview.asWebviewUri(vscode.Uri.file(path.join(extensionUri.fsPath, 'FahhLogo.png')));

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Fahh</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
        }

        .container {
            text-align: center;
            animation: fadeIn 1.5s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .logo {
            width: 150px;
            height: 150px;
            margin-bottom: 20px;
            filter: drop-shadow(0 0 10px rgba(255, 0, 0, 0.5));
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); filter: drop-shadow(0 0 20px rgba(255, 0, 0, 0.8)); }
            100% { transform: scale(1); }
        }

        h1 {
            font-size: 3rem;
            margin: 0;
            background: linear-gradient(45deg, #ff4e50, #f9d423);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        p {
            font-size: 1.2rem;
            opacity: 0.8;
            margin-bottom: 40px;
        }

        .features {
            display: flex;
            gap: 20px;
            margin-bottom: 40px;
        }

        .feature-card {
            background: var(--vscode-button-secondaryBackground);
            padding: 20px;
            border-radius: 12px;
            width: 150px;
            transition: transform 0.3s;
        }

        .feature-card:hover {
            transform: translateY(-10px);
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .icon {
            font-size: 2rem;
            margin-bottom: 10px;
        }

        .btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 12px 30px;
            font-size: 1.1rem;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .sound-wave {
            display: flex;
            align-items: flex-end;
            gap: 3px;
            height: 40px;
            margin-top: 20px;
        }

        .bar {
            width: 4px;
            background: #ff4e50;
            animation: wave 1s infinite ease-in-out;
        }

        @keyframes wave {
            0%, 100% { height: 10px; }
            50% { height: 40px; }
        }

        .bar:nth-child(2) { animation-delay: 0.1s; }
        .bar:nth-child(3) { animation-delay: 0.2s; }
        .bar:nth-child(4) { animation-delay: 0.3s; }
        .bar:nth-child(5) { animation-delay: 0.4s; }
    </style>
</head>
<body>
    <div class="container">
        <img src="${logoPath}" class="logo" alt="Fahh Logo">
        <h1>Fahh!</h1>
        <p>The companion that hears your mistakes.</p>

        <div class="features">
            <div class="feature-card">
                <div class="icon">🔊</div>
                <div>Audio Feedback</div>
            </div>
            <div class="feature-card">
                <div class="icon">🤖</div>
                <div>AI Explanations</div>
            </div>
            <div class="feature-card">
                <div class="icon">⚡</div>
                <div>Zero Latency</div>
            </div>
        </div>

        <button class="btn" onclick="testSound()">Test it Now</button>

        <div class="sound-wave">
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        function testSound() {
            vscode.postMessage({ command: 'test' });
        }
    </script>
</body>
</html>`;
    }
}
