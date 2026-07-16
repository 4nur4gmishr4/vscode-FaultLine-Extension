import * as vscode from 'vscode';

/**
 * Discriminated union of every command the welcome webview is allowed to send.
 *
 * Defining this explicitly (instead of typing the listener as `any`) means a
 * mistyped or attacker-injected message lands in the implicit `default` branch
 * and is dropped by the handler instead of triggering a config write.
 */
type WelcomeMessage =
    | { command: 'test' }
    | { command: 'testSuccess' }
    | { command: 'reset' }
    | { command: 'error'; text?: string }
    | { command: 'setSound'; sound?: string }
    | { command: 'setSuccessSound'; sound?: string }
    | { command: 'openSettings' };

/**
 * Manages the welcome webview panel for first-run experience.
 * Displays extension features, sound selection, and test audio functionality.
 */
export class WelcomePanel {
    public static currentPanel: WelcomePanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private disposed = false;

    /**
     * Creates or reveals the welcome panel.
     * If a panel already exists, it will be revealed instead of creating a new one.
     * 
     * @param extensionUri - The URI of the extension root directory
     * @returns void
     */
    /**
     * @param withIntro - When true (first install), show typing greeting then welcome body.
     *                    When false (command palette), open the welcome body immediately.
     */
    public static createOrShow(extensionUri: vscode.Uri, withIntro = false): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (WelcomePanel.currentPanel) {
            WelcomePanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'faultlineWelcome',
            'Welcome to FaultLine!',
            column ?? vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources')]
            }
        );

        WelcomePanel.currentPanel = new WelcomePanel(panel, extensionUri, withIntro);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        private readonly withIntro: boolean
    ) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlForWebview(
            this._panel.webview,
            extensionUri,
            this.withIntro
        );

        // Handle messages from the webview. Strictly typed and shape-validated
        // before use so a compromised webview can't smuggle arbitrary fields
        // into config writes or notifications.
        this._panel.webview.onDidReceiveMessage(
            (message: WelcomeMessage) => {
                void this.handleWebviewMessage(message);
            },
            null,
            this._disposables
        );
    }

    private async handleWebviewMessage(
        message: WelcomeMessage
    ): Promise<void> {
        if (!message || typeof message.command !== 'string') {
            return;
        }
        switch (message.command) {
            case 'test':
                await vscode.commands.executeCommand('faultline.test');
                return;
            case 'testSuccess':
                await vscode.commands.executeCommand('faultline.testSuccess');
                return;
            case 'reset':
                await vscode.commands.executeCommand('faultline.resetSettings');
                return;
            case 'error':
                if (typeof message.text === 'string') {
                    void vscode.window.showErrorMessage(message.text);
                }
                return;
            case 'setSound':
                if (typeof message.sound === 'string' && /^[\w.-]+\.(mp3|wav|ogg|flac|m4a)$/i.test(message.sound)) {
                    await vscode.workspace.getConfiguration('faultline')
                        .update('soundPack', message.sound, vscode.ConfigurationTarget.Global);
                }
                return;
            case 'setSuccessSound':
                if (typeof message.sound === 'string' && /^[\w.-]+\.(mp3|wav|ogg|flac|m4a)$/i.test(message.sound)) {
                    await vscode.workspace.getConfiguration('faultline')
                        .update('successSound', message.sound, vscode.ConfigurationTarget.Global);
                }
                return;
            case 'openSettings':
                await vscode.commands.executeCommand('faultline.openSettings');
                return;
        }
    }

    /**
     * Disposes of the welcome panel and cleans up resources.
     * Removes the current panel reference and disposes all event listeners.
     * 
     * @returns void
     */
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        WelcomePanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    /**
     * Generates the HTML content for the welcome webview.
     * Includes styling, interactive elements, and CSP-compliant scripts.
     * 
     * @param webview - The webview instance to generate HTML for
     * @param extensionUri - The URI of the extension root directory
     * @returns The complete HTML string for the webview
     */
    private _getHtmlForWebview(
        webview: vscode.Webview,
        extensionUri: vscode.Uri,
        withIntro: boolean
    ): string {
        const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'resources', 'faultline-logo.png')).toString();
        const audioUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'resources', 'packs', 'default', 'faultline.mp3'));
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'resources', 'vendor', 'codicons', 'dist', 'codicon.css'));
        const nonce = generateNonce();
        const introDisplay = withIntro ? 'flex' : 'none';
        const mainDisplay = withIntro ? 'none' : 'flex';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; img-src ${webview.cspSource}; media-src ${webview.cspSource}; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
    <link href="${codiconsUri.toString()}" rel="stylesheet" />
    <title>Welcome to FaultLine</title>
    <style>
        :root {
            --accent-color: #ffffff;
            --bg-color: #000000;
            --text-color: #ffffff;
            --secondary-bg: #1a1a1a;
            --border-color: #333333;
            --danger-color: #ff4444;
            --muted: #9a9a9a;
        }

        * { box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            overflow-x: hidden;
            position: relative;
        }

        /* ----- Intro (typing) ----- */
        #intro {
            display: ${introDisplay};
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            width: 100%;
            padding: 40px 24px;
            text-align: center;
        }

        #intro.hidden { display: none !important; }

        .intro-logo {
            width: 88px;
            height: 88px;
            margin-bottom: 36px;
            filter: grayscale(1) brightness(2);
            opacity: 0.9;
        }

        .type-wrap {
            max-width: 520px;
            min-height: 140px;
            margin: 0 auto 28px;
            text-align: left;
        }

        #type-text {
            font-size: 1.25rem;
            line-height: 1.7;
            font-weight: 400;
            letter-spacing: 0.01em;
            white-space: pre-wrap;
            color: var(--text-color);
        }

        .cursor {
            display: inline-block;
            width: 2px;
            height: 1.15em;
            background: var(--accent-color);
            margin-left: 2px;
            vertical-align: text-bottom;
            animation: blink 0.9s step-end infinite;
        }

        .cursor.done { display: none; }

        @keyframes blink {
            50% { opacity: 0; }
        }

        .skip-btn {
            background: transparent;
            color: var(--muted);
            border: 1px solid var(--border-color);
            padding: 10px 28px;
            font-size: 0.8rem;
            font-weight: 600;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            border-radius: 4px;
            cursor: pointer;
            transition: color 0.2s, border-color 0.2s;
        }

        .skip-btn:hover {
            color: var(--text-color);
            border-color: var(--accent-color);
        }

        /* ----- Main welcome ----- */
        #main {
            display: ${mainDisplay};
            flex-direction: column;
            align-items: center;
            width: 100%;
            min-height: 100vh;
            position: relative;
        }

        #main.visible { display: flex !important; animation: fadeIn 0.55s ease-out; }

        .header-actions {
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 2;
        }

        .btn-danger {
            background: transparent;
            color: var(--danger-color);
            border: 1px solid var(--danger-color);
            padding: 8px 16px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-danger:hover {
            background: var(--danger-color);
            color: var(--bg-color);
        }

        .sound-selector {
            margin-bottom: 30px;
            text-align: center;
        }

        .selector-label {
            display: block;
            margin-bottom: 10px;
            font-size: 1rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            opacity: 0.7;
        }

        .sound-select {
            background: var(--secondary-bg);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 10px 15px;
            font-size: 1rem;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .sound-select:hover {
            border-color: var(--accent-color);
        }

        .sound-select:focus {
            outline: none;
            border-color: var(--accent-color);
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
        }

        .container {
            max-width: 800px;
            padding: 40px;
            text-align: center;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .logo-container {
            position: relative;
            margin-bottom: 30px;
        }

        .logo {
            width: 120px;
            height: 120px;
            filter: grayscale(1) brightness(2);
            animation: breathe 4s infinite ease-in-out;
        }

        @keyframes breathe {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.05); opacity: 1; }
        }

        h1 {
            font-size: 3.5rem;
            font-weight: 800;
            letter-spacing: -2px;
            margin: 0 0 10px 0;
            text-transform: uppercase;
        }

        .tagline {
            font-size: 1.1rem;
            letter-spacing: 4px;
            text-transform: uppercase;
            opacity: 0.5;
            margin-bottom: 24px;
        }

        .credit {
            font-size: 0.95rem;
            color: var(--muted);
            margin-bottom: 48px;
            line-height: 1.5;
        }

        .credit strong {
            color: var(--text-color);
            font-weight: 600;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 60px;
        }

        .card {
            background: var(--secondary-bg);
            border: 1px solid var(--border-color);
            padding: 30px 20px;
            border-radius: 4px;
            transition: all 0.3s ease;
        }

        .card:hover {
            border-color: var(--accent-color);
            transform: translateY(-5px);
        }

        .card-icon {
            font-size: 1.5rem;
            margin-bottom: 15px;
        }

        .card-title {
            font-size: 0.9rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .btn {
            background: var(--accent-color);
            color: var(--bg-color);
            border: none;
            padding: 15px 40px;
            font-size: 0.9rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            cursor: pointer;
            border-radius: 2px;
            transition: opacity 0.2s;
        }

        .btn:hover {
            opacity: 0.9;
        }

        .visualizer {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            height: 60px;
            margin-top: 40px;
        }

        .bar {
            width: 3px;
            background: var(--accent-color);
            height: 4px;
            animation: none;
        }

        .visualizer.active .bar {
            animation: barHeight 0.8s infinite ease-in-out;
        }

        @keyframes barHeight {
            0%, 100% { height: 4px; }
            50% { height: 40px; }
        }

        .bar:nth-child(1) { animation-delay: 0.1s; }
        .bar:nth-child(2) { animation-delay: 0.3s; }
        .bar:nth-child(3) { animation-delay: 0.2s; }
        .bar:nth-child(4) { animation-delay: 0.4s; }
        .bar:nth-child(5) { animation-delay: 0.15s; }

        .footer-credit {
            margin-top: 48px;
            font-size: 0.8rem;
            color: var(--muted);
        }
    </style>
</head>
<body>
    <!-- First-install greeting -->
    <div id="intro" aria-live="polite">
        <img src="${logoUri}" class="intro-logo" alt="FaultLine" />
        <div class="type-wrap">
            <span id="type-text"></span><span id="cursor" class="cursor"></span>
        </div>
        <button type="button" class="skip-btn" id="skip-btn">Skip</button>
    </div>

    <!-- Main welcome -->
    <div id="main">
        <div class="header-actions">
            <button id="settings-btn" class="btn" style="padding: 8px 16px; font-size: 0.8rem; margin-right: 10px;" type="button">
                <span class="codicon codicon-settings-gear" style="vertical-align: middle;"></span> AI &amp; Settings
            </button>
            <button id="reset-btn" class="btn-danger" type="button">Reset All Settings</button>
        </div>

        <div class="container">
            <div class="logo-container">
                <img src="${logoUri}" class="logo" alt="FaultLine Logo">
            </div>
            <h1>FaultLine</h1>
            <div class="tagline">When builds fail, you're not alone</div>
            <p class="credit">Made by <strong>Anurag Mishra</strong> — for every developer who ships.</p>

            <div class="grid">
                <div class="card">
                    <div class="card-icon"><span class="codicon codicon-zap"></span></div>
                    <div class="card-title">Catches fails fast</div>
                </div>
                <div class="card">
                    <div class="card-icon"><span class="codicon codicon-megaphone"></span></div>
                    <div class="card-title">Optional sounds</div>
                </div>
                <div class="card">
                    <div class="card-icon"><span class="codicon codicon-hubot"></span></div>
                    <div class="card-title">AI when you want</div>
                </div>
            </div>

            <div class="sound-selector">
                <label for="sound-select" class="selector-label">Choose Failure Sound</label>
                <select id="sound-select" class="sound-select">
                    <option value="faultline.mp3">Classic FaultLine (Default)</option>
                    <option value="faultlinehard.mp3">Impact Strike</option>
                    <option value="fartreverb.mp3">Reverb Blast</option>
                    <option value="faultlinedeep.mp3">Deep Resonance</option>
                    <option value="faultlinebroke.mp3">System Crash</option>
                    <option value="ohshit.mp3">Quick Expletive</option>
                </select>
                <button id="test-btn" class="btn" style="margin-top: 10px;" type="button">Test Failure Audio Now</button>
            </div>

            <div class="sound-selector" style="margin-top: 20px;">
                <label for="success-sound-select" class="selector-label">Choose Success Sound</label>
                <select id="success-sound-select" class="sound-select">
                    <option value="success_ding.mp3">Success Ding (Default)</option>
                    <option value="success_trumphet.mp3">Success Trumpet</option>
                </select>
                <button id="test-success-btn" class="btn" style="margin-top: 10px;" type="button">Test Success Audio Now</button>
            </div>

            <div id="visualizer" class="visualizer">
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
            </div>

            <p class="footer-credit">FaultLine · by Anurag Mishra · for developers everywhere</p>

            <audio id="faultline-audio" src="${audioUri.toString()}" preload="auto"></audio>
        </div>
    </div>

    <script nonce="${nonce}">
        (function() {
            const vscode = acquireVsCodeApi();
            const withIntro = ${withIntro ? 'true' : 'false'};

            const greetLines = [
                "Hey — I'm Anurag Mishra.",
                "",
                "I built FaultLine for every developer who ships,",
                "so when things break, you are not alone in the terminal.",
                "",
                "Welcome. Let's get you set up."
            ];
            const fullText = greetLines.join("\\n");

            const intro = document.getElementById('intro');
            const main = document.getElementById('main');
            const typeEl = document.getElementById('type-text');
            const cursor = document.getElementById('cursor');
            const skipBtn = document.getElementById('skip-btn');

            let typingTimer = null;
            let finished = false;

            function showMain() {
                if (finished) return;
                finished = true;
                if (typingTimer) {
                    clearTimeout(typingTimer);
                    typingTimer = null;
                }
                if (intro) intro.classList.add('hidden');
                if (main) main.classList.add('visible');
                if (cursor) cursor.classList.add('done');
            }

            function typeGreet() {
                if (!typeEl || !withIntro) {
                    showMain();
                    return;
                }
                let i = 0;
                const speed = 28;
                function tick() {
                    if (finished) return;
                    if (i <= fullText.length) {
                        typeEl.textContent = fullText.slice(0, i);
                        i += 1;
                        // Slight pause on newlines
                        const prev = fullText[i - 2];
                        const delay = prev === "\\n" ? 220 : speed;
                        typingTimer = setTimeout(tick, delay);
                    } else {
                        if (cursor) cursor.classList.add('done');
                        typingTimer = setTimeout(showMain, 650);
                    }
                }
                tick();
            }

            skipBtn?.addEventListener('click', () => showMain());

            if (withIntro) {
                typeGreet();
            } else {
                showMain();
            }

            document.getElementById('test-btn')?.addEventListener('click', () => {
                vscode.postMessage({ command: 'test' });
            });
            document.getElementById('test-success-btn')?.addEventListener('click', () => {
                vscode.postMessage({ command: 'testSuccess' });
            });
            document.getElementById('settings-btn')?.addEventListener('click', () => {
                vscode.postMessage({ command: 'openSettings' });
            });
            document.getElementById('reset-btn')?.addEventListener('click', () => {
                vscode.postMessage({ command: 'reset' });
            });

            document.getElementById('sound-select')?.addEventListener('change', (e) => {
                const select = e.target;
                if (select) {
                    vscode.postMessage({ command: 'setSound', sound: select.value });
                }
            });

            document.getElementById('success-sound-select')?.addEventListener('change', (e) => {
                const select = e.target;
                if (select) {
                    vscode.postMessage({ command: 'setSuccessSound', sound: select.value });
                }
            });
        })();
    </script>
</body>
</html>`;
    }
}

/**
 * Generates a cryptographically random nonce for Content Security Policy.
 * Used to allow specific inline scripts while maintaining CSP security.
 * 
 * @returns A 32-character random string
 */
function generateNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
