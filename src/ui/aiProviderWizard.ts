import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { Logger } from '../utils/logger';
import { SecretManager } from '../config/secretManager';
import { ConfigManager } from '../config/configManager';
import {
    listProviders,
    getProvider,
    chatWithTimeout,
    validateProviderKey
} from '../integrations/aiProviders';
import { WEBVIEW_PANELS } from '../config/constants';

/**
 * Webview wizard that guides users through selecting an AI provider and storing
 * their own API key on first install (or whenever they invoke
 * `Fahh: Configure AI Provider`).
 *
 * The wizard:
 *  - Lists every supported provider with description and a "Get free key" link.
 *  - Accepts the user's own API key (password input, never logged or transmitted
 *    anywhere except to the chosen provider for the test-connection call).
 *  - Validates the key format locally before storage.
 *  - Optionally tests the key with a tiny round-trip to the provider.
 *  - Stores the validated key in VS Code SecretStorage (encrypted at rest).
 *
 * SECURITY:
 *  - `acquireVsCodeApi()` is called exactly once in the webview (CSP-safe).
 *  - All button handlers use `addEventListener` (inline onclick is CSP-blocked).
 *  - API keys are never echoed back to the webview or written to logs.
 */
export class AiProviderWizard {
    private static instance: AiProviderWizard | undefined;

    private panel: vscode.WebviewPanel | undefined;
    private disposables: vscode.Disposable[] = [];

    private constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly secretManager: SecretManager,
        private readonly configManager: ConfigManager,
        private readonly logger: Logger
    ) {}

    /**
     * Show the wizard, reusing an existing panel if one is open.
     */
    public static createOrShow(
        extensionUri: vscode.Uri,
        secretManager: SecretManager,
        configManager: ConfigManager,
        logger: Logger
    ): void {
        if (!AiProviderWizard.instance) {
            AiProviderWizard.instance = new AiProviderWizard(
                extensionUri, secretManager, configManager, logger
            );
        }
        AiProviderWizard.instance.show();
    }

    private show(): void {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
            this.postInitState();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            WEBVIEW_PANELS.AI_PROVIDER_WIZARD,
            'Fahh: Configure AI Provider',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'resources')]
            }
        );

        this.panel.webview.html = this.getHtml(this.panel.webview);
        this.setupMessageHandlers();

        this.panel.onDidDispose(() => {
            this.panel = undefined;
            this.disposables.forEach(d => d.dispose());
            this.disposables = [];
        });
    }

    private setupMessageHandlers(): void {
        if (!this.panel) return;
        this.panel.webview.onDidReceiveMessage(
            async message => {
                try {
                    switch (message.command) {
                        case 'ready':
                            this.postInitState();
                            return;
                        case 'openExternal':
                            await this.openExternalSafe(message.url);
                            return;
                        case 'saveKey':
                            await this.handleSaveKey(message.providerId, message.apiKey);
                            return;
                        case 'testKey':
                            await this.handleTestKey(message.providerId, message.apiKey);
                            return;
                        case 'selectProvider':
                            await this.handleSelectProvider(message.providerId);
                            return;
                        case 'enableAi':
                            await this.setAiEnabled(true);
                            this.postFinish('AI features enabled.');
                            return;
                        case 'skip':
                            await this.setAiEnabled(false);
                            this.postFinish('AI features disabled. You can configure later via the command palette.');
                            return;
                        default:
                            this.logger.warn(`Unknown wizard message: ${message.command}`);
                    }
                } catch (err) {
                    this.logger.error('Wizard message handler error', err);
                    this.postError(err instanceof Error ? err.message : String(err));
                }
            },
            undefined,
            this.disposables
        );
    }

    /**
     * Open a URL only if it matches one of the known provider sign-up URLs.
     *
     * SECURITY: prevents a compromised or buggy webview from invoking
     * `openExternal` with an arbitrary URL (e.g. file://, javascript:, attacker-controlled).
     */
    private async openExternalSafe(url: unknown): Promise<void> {
        if (typeof url !== 'string' || url.length > 500) {
            this.logger.warn('openExternal rejected non-string or oversize URL');
            return;
        }
        const allowed = new Set(listProviders().map(p => p.getKeyUrl));
        if (!allowed.has(url)) {
            this.logger.warn(`openExternal rejected unknown URL: ${url}`);
            return;
        }
        await vscode.env.openExternal(vscode.Uri.parse(url));
    }

    private postInitState(): void {
        if (!this.panel) return;
        const cfg = this.configManager.readConfig();
        // Build provider list with "hasKey" flag so the UI can show a check mark
        void this.buildProviderState(cfg.aiProvider).then(providers => {
            void this.panel?.webview.postMessage({
                command: 'init',
                providers,
                activeProvider: cfg.aiProvider
            });
        });
    }

    private async buildProviderState(activeId: string): Promise<unknown[]> {
        const result: unknown[] = [];
        for (const info of listProviders()) {
            const hasKey = info.keyFormat === null
                ? true
                : await this.secretManager.hasApiKey(info.id);
            result.push({
                id: info.id,
                name: info.displayName,
                description: info.description,
                getKeyUrl: info.getKeyUrl,
                keyFormatHint: info.keyFormatHint,
                requiresKey: info.keyFormat !== null,
                hasKey,
                isActive: info.id === activeId.toLowerCase()
            });
        }
        return result;
    }

    private async handleSelectProvider(providerId: string): Promise<void> {
        const info = getProvider(providerId)?.info;
        if (!info) {
            this.postError(`Unknown provider: ${providerId}`);
            return;
        }
        await vscode.workspace.getConfiguration('fahh').update(
            'aiProvider',
            info.id,
            vscode.ConfigurationTarget.Global
        );
        this.postInitState();
        void this.panel?.webview.postMessage({
            command: 'providerSelected',
            providerId: info.id,
            message: `${info.displayName} selected.`
        });
    }

    private async handleSaveKey(providerId: string, apiKey: string): Promise<void> {
        try {
            validateProviderKey(providerId, apiKey);
        } catch (err) {
            this.postError(err instanceof Error ? err.message : String(err));
            return;
        }
        await this.secretManager.storeApiKey(providerId, apiKey);
        await vscode.workspace.getConfiguration('fahh').update(
            'aiProvider',
            providerId,
            vscode.ConfigurationTarget.Global
        );
        await this.setAiEnabled(true);
        this.postInitState();
        void this.panel?.webview.postMessage({
            command: 'keySaved',
            providerId,
            message: 'API key saved securely. AI features enabled.'
        });
    }

    private async handleTestKey(providerId: string, apiKey: string): Promise<void> {
        try {
            validateProviderKey(providerId, apiKey);
        } catch (err) {
            this.postError(err instanceof Error ? err.message : String(err));
            return;
        }
        const provider = getProvider(providerId);
        if (!provider) {
            this.postError(`Unknown provider: ${providerId}`);
            return;
        }
        const model = provider.info.defaultModel;
        void this.panel?.webview.postMessage({ command: 'testStarted', providerId });

        const response = await chatWithTimeout(
            provider,
            {
                prompt: 'Reply with exactly one word: ok',
                maxTokens: 8,
                apiKey,
                model
            },
            15000
        );

        if (response && response.length > 0) {
            void this.panel?.webview.postMessage({
                command: 'testSuccess',
                providerId,
                message: `Connection successful. Model responded with: "${response.slice(0, 60)}"`
            });
        } else {
            void this.panel?.webview.postMessage({
                command: 'testFailed',
                providerId,
                message: 'No response from provider. Check the key and your network connection.'
            });
        }
    }

    private async setAiEnabled(enabled: boolean): Promise<void> {
        const cfg = vscode.workspace.getConfiguration('fahh');
        await cfg.update('errorExplanation.enabled', enabled, vscode.ConfigurationTarget.Global);
        if (!enabled) {
            await cfg.update('aiSummary.enabled', false, vscode.ConfigurationTarget.Global);
        }
    }

    private postError(message: string): void {
        void this.panel?.webview.postMessage({ command: 'error', message });
    }

    private postFinish(message: string): void {
        void this.panel?.webview.postMessage({ command: 'finish', message });
    }

    private getNonce(): string {
        return randomBytes(16).toString('base64');
    }

    private getHtml(webview: vscode.Webview): string {
        const nonce = this.getNonce();
        const cspSource = webview.cspSource;
        // SECURITY: replace `</` with escaped sequence so a description containing
        // "</script>" cannot break out of the inline <script> block.
        const providersJson = JSON.stringify(listProviders().map(p => ({
            id: p.id,
            name: p.displayName,
            description: p.description,
            getKeyUrl: p.getKeyUrl,
            keyFormatHint: p.keyFormatHint,
            requiresKey: p.keyFormat !== null,
            category: p.category
        }))).replace(/<\//g, '<\\/');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <title>Fahh: Configure AI Provider</title>
    <style nonce="${nonce}">
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --border-color: #333333;
            --bg-color: #1e1e1e;
            --text-color: #ffffff;
            --text-muted: #888888;
        }
        body {
            font-family: var(--vscode-font-family, sans-serif);
            font-size: var(--vscode-font-size, 14px);
            color: var(--text-color);
            background: var(--bg-color);
            min-height: 100vh;
            padding: 16px;
            line-height: 1.5;
        }
        .container { max-width: 700px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 {
            font-size: 20px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
        }
        .header p { color: var(--text-muted); font-size: 12px; }
        .step-section { margin-bottom: 24px; }
        .step-label {
            display: inline-block;
            padding: 4px 12px;
            background: #333333;
            color: #ffffff;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 1px;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        .step-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
        .provider-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
        }
        .provider-card {
            background: #000000;
            border: 2px solid #333333;
            padding: 16px;
            cursor: pointer;
        }
        .provider-card:hover {
            border-color: #ffffff;
        }
        .provider-card.selected {
            border-color: #ffffff;
            background: #111111;
        }
        .provider-card.has-key::after {
            content: '✓';
            position: absolute;
            top: 8px;
            right: 8px;
            width: 20px;
            height: 20px;
            background: #333333;
            color: #ffffff;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
        }
        .provider-name { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
        .provider-desc { color: var(--text-muted); font-size: 11px; margin-bottom: 8px; }
        .provider-link {
            color: #ffffff;
            text-decoration: none;
            font-size: 11px;
            font-weight: 600;
        }
        .provider-link:hover { text-decoration: underline; }
        .key-input-section {
            background: #000000;
            border: 2px solid #333333;
            padding: 16px;
            margin-top: 16px;
        }
        .key-input-section.hidden { display: none; }
        .key-input-section label {
            display: block;
            font-weight: 600;
            margin-bottom: 6px;
            font-size: 12px;
        }
        .key-input-section .hint {
            color: var(--text-muted);
            font-size: 11px;
            margin-bottom: 8px;
        }
        .key-input-section input {
            width: 100%;
            padding: 8px 12px;
            background: #111111;
            color: #ffffff;
            border: 2px solid #333333;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 12px;
        }
        .key-input-section input:focus {
            outline: none;
            border-color: #ffffff;
        }
        .button-row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        .btn {
            padding: 8px 16px;
            border: 2px solid #333333;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            background: #000000;
            color: #ffffff;
        }
        .btn:hover { background: #333333; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .status {
            margin-top: 12px;
            padding: 8px 12px;
            font-size: 12px;
            display: none;
        }
        .status.visible { display: block; }
        .status.success { background: #111111; color: #ffffff; border: 2px solid #333333; }
        .status.error { background: #111111; color: #ffffff; border: 2px solid #333333; }
        .status.info { background: #111111; color: #ffffff; border: 2px solid #333333; }
        .footer {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 2px solid #333333;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }
        .footer-note { color: var(--text-muted); font-size: 11px; }
        .category-section {
            margin-bottom: 20px;
        }
        .category-title {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 4px;
            color: #ffffff;
        }
        .category-desc {
            font-size: 11px;
            color: var(--text-muted);
            margin-bottom: 8px;
        }
        .privacy-note {
            background: #111111;
            border-left: 2px solid #333333;
            padding: 8px 12px;
            margin-top: 12px;
            font-size: 11px;
            color: var(--text-muted);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Configure AI Provider</h1>
            <p>Pick a free AI provider and enter your own API key. Keys are stored encrypted in VS Code's SecretStorage.</p>
        </div>

        <div class="step-section">
            <span class="step-label">Step 1</span>
            <h2 class="step-title">Choose a provider</h2>

            <div class="category-section">
                <h3 class="category-title">Free / Open-Source</h3>
                <p class="category-desc">Providers with generous free tiers or free open-source models</p>
                <div class="provider-grid" id="gridFree"></div>
            </div>

            <div class="category-section">
                <h3 class="category-title">Paid / Closed-Source</h3>
                <p class="category-desc">Commercial providers that charge per token (no free tier)</p>
                <div class="provider-grid" id="gridPaid"></div>
            </div>

            <div class="category-section">
                <h3 class="category-title">VS Code Built-In</h3>
                <p class="category-desc">No API key needed — uses your existing VS Code Language Model API</p>
                <div class="provider-grid" id="gridBuiltin"></div>
            </div>
        </div>

        <div class="step-section">
            <span class="step-label">Step 2</span>
            <h2 class="step-title" id="step2Title">Add your API key</h2>
            <div class="key-input-section hidden" id="keySection">
                <label for="apiKeyInput">API key for <span id="selectedName">—</span></label>
                <div class="hint" id="keyHint">—</div>
                <input type="password" id="apiKeyInput" autocomplete="off" spellcheck="false" placeholder="Paste your API key here">
                <div class="button-row">
                    <button class="btn btn-primary" id="saveBtn" disabled>Save &amp; Enable</button>
                    <button class="btn btn-secondary" id="testBtn" disabled>Test Connection</button>
                    <a class="btn btn-secondary" id="getKeyLink" href="#" style="text-decoration:none; display:inline-block;">Get free key →</a>
                </div>
                <div class="status" id="status"></div>
            </div>
            <div class="key-input-section hidden" id="copilotSection">
                <p>GitHub Copilot uses VS Code's built-in Language Model API. No API key needed — just make sure you have Copilot (or Copilot Free) signed in.</p>
                <div class="button-row">
                    <button class="btn btn-primary" id="useCopilotBtn">Use Copilot</button>
                </div>
            </div>
            <div class="privacy-note">
                Your API key is sent only to the provider you choose, exactly when an error explanation is requested.
                It is never sent to the Fahh extension author or any third party.
            </div>
        </div>

        <div class="footer">
            <span class="footer-note">You can change this anytime via <code>Fahh: Configure AI Provider</code>.</span>
            <button class="btn btn-secondary" id="skipBtn">Skip &amp; disable AI</button>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscodeApi = acquireVsCodeApi();
        const providersStatic = ${providersJson};
        let providersState = [];
        let selectedId = null;

        const gridFree = document.getElementById('gridFree');
        const gridPaid = document.getElementById('gridPaid');
        const gridBuiltin = document.getElementById('gridBuiltin');
        const keySection = document.getElementById('keySection');
        const copilotSection = document.getElementById('copilotSection');
        const selectedName = document.getElementById('selectedName');
        const keyHint = document.getElementById('keyHint');
        const apiKeyInput = document.getElementById('apiKeyInput');
        const saveBtn = document.getElementById('saveBtn');
        const testBtn = document.getElementById('testBtn');
        const getKeyLink = document.getElementById('getKeyLink');
        const statusEl = document.getElementById('status');
        const useCopilotBtn = document.getElementById('useCopilotBtn');
        const skipBtn = document.getElementById('skipBtn');

        function renderGrid() {
            gridFree.innerHTML = '';
            gridPaid.innerHTML = '';
            gridBuiltin.innerHTML = '';
            providersStatic.forEach(p => {
                const card = document.createElement('div');
                card.className = 'provider-card';
                card.setAttribute('data-id', p.id);
                if (selectedId === p.id) card.classList.add('selected');
                const state = providersState.find(s => s.id === p.id);
                if (state && state.hasKey && state.requiresKey) card.classList.add('has-key');
                card.innerHTML = \`
                    <div class="provider-name">\${escapeHtml(p.name)}</div>
                    <div class="provider-desc">\${escapeHtml(p.description)}</div>
                    \${p.requiresKey ? '<a class="provider-link" data-url="' + escapeHtml(p.getKeyUrl) + '" href="#">Get free key &rarr;</a>' : '<span class="provider-link">No key needed</span>'}
                \`;
                card.addEventListener('click', (e) => {
                    if ((e.target instanceof HTMLElement) && e.target.classList.contains('provider-link')) {
                        e.preventDefault();
                        const url = e.target.getAttribute('data-url');
                        if (url) vscodeApi.postMessage({ command: 'openExternal', url });
                        return;
                    }
                    selectProvider(p.id);
                });
                if (p.category === 'free') {
                    gridFree.appendChild(card);
                } else if (p.category === 'paid') {
                    gridPaid.appendChild(card);
                } else if (p.category === 'builtin') {
                    gridBuiltin.appendChild(card);
                }
            });
        }

        function selectProvider(id) {
            selectedId = id;
            const provider = providersStatic.find(p => p.id === id);
            if (!provider) return;
            vscodeApi.postMessage({ command: 'selectProvider', providerId: id });
            renderGrid();
            hideStatus();
            if (provider.requiresKey) {
                keySection.classList.remove('hidden');
                copilotSection.classList.add('hidden');
                selectedName.textContent = provider.name;
                keyHint.textContent = 'Format: ' + provider.keyFormatHint;
                getKeyLink.setAttribute('data-url', provider.getKeyUrl);
                apiKeyInput.value = '';
                saveBtn.disabled = true;
                testBtn.disabled = true;
            } else {
                keySection.classList.add('hidden');
                copilotSection.classList.remove('hidden');
            }
        }

        apiKeyInput.addEventListener('input', () => {
            const empty = apiKeyInput.value.trim().length === 0;
            saveBtn.disabled = empty;
            testBtn.disabled = empty;
        });

        saveBtn.addEventListener('click', () => {
            if (!selectedId) return;
            vscodeApi.postMessage({
                command: 'saveKey',
                providerId: selectedId,
                apiKey: apiKeyInput.value.trim()
            });
        });

        testBtn.addEventListener('click', () => {
            if (!selectedId) return;
            showStatus('info', 'Testing connection…');
            testBtn.disabled = true;
            vscodeApi.postMessage({
                command: 'testKey',
                providerId: selectedId,
                apiKey: apiKeyInput.value.trim()
            });
        });

        getKeyLink.addEventListener('click', (e) => {
            e.preventDefault();
            const url = getKeyLink.getAttribute('data-url');
            if (url) vscodeApi.postMessage({ command: 'openExternal', url });
        });

        useCopilotBtn.addEventListener('click', () => {
            vscodeApi.postMessage({ command: 'enableAi' });
        });

        skipBtn.addEventListener('click', () => {
            vscodeApi.postMessage({ command: 'skip' });
        });

        window.addEventListener('message', event => {
            const m = event.data;
            switch (m.command) {
                case 'init':
                    providersState = m.providers;
                    if (!selectedId) selectedId = m.activeProvider;
                    renderGrid();
                    const provider = providersStatic.find(p => p.id === selectedId);
                    if (provider) selectProvider(selectedId);
                    break;
                case 'keySaved':
                    showStatus('success', m.message);
                    testBtn.disabled = false;
                    break;
                case 'providerSelected':
                    // Nothing more to do — UI already updated locally
                    break;
                case 'testStarted':
                    showStatus('info', 'Testing connection…');
                    break;
                case 'testSuccess':
                    showStatus('success', m.message);
                    testBtn.disabled = false;
                    break;
                case 'testFailed':
                    showStatus('error', m.message);
                    testBtn.disabled = false;
                    break;
                case 'error':
                    showStatus('error', m.message);
                    testBtn.disabled = false;
                    break;
                case 'finish':
                    showStatus('success', m.message);
                    break;
            }
        });

        function showStatus(kind, text) {
            statusEl.textContent = text;
            statusEl.className = 'status visible ' + kind;
        }
        function hideStatus() {
            statusEl.className = 'status';
            statusEl.textContent = '';
        }
        function escapeHtml(s) {
            const div = document.createElement('div');
            div.textContent = s == null ? '' : String(s);
            return div.innerHTML;
        }

        // Signal extension that webview is ready
        vscodeApi.postMessage({ command: 'ready' });
    </script>
</body>
</html>`;
    }
}
