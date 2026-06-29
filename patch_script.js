const fs = require('fs');
let code = fs.readFileSync('src/ui/settingsPanel.ts', 'utf8');

// Replace the API key HTML
const oldApiKeyDiv = '<vscode-text-field id="apiKey" type="password" placeholder="Enter API key..."></vscode-text-field>';
const newApiKeyDiv = `
                <div style="display: flex; gap: 8px; margin-top: 8px; align-items: center;">
                    <vscode-text-field id="apiKey" type="password" placeholder="Enter API key..." style="flex: 1;"></vscode-text-field>
                    <vscode-button id="apiKeySubmit">Save API Key</vscode-button>
                </div>
                <div id="apiKeyStatus" style="color: var(--vscode-charts-green); margin-top: 4px; font-size: 12px; height: 16px;"></div>`;
code = code.replace(oldApiKeyDiv, newApiKeyDiv);

// Replace the apply message handling
const oldApply = `                    case 'apply':
                        await this.applyChanges();
                        return;`;
const newApply = `                    case 'apply':
                        await this.applyChanges();
                        return;
                    case 'saveApiKeyQuick':
                        if (message.apiKey) {
                            const config = this.configManager.readConfig();
                            await this.secretManager.storeApiKey(config.ai.provider, message.apiKey.trim());
                            void this.panel.webview.postMessage({ command: 'apiKeySaved' });
                        }
                        return;`;
code = code.replace(oldApply, newApply);

// Replace frontend event listeners
const oldListeners = `        document.getElementById('aiProvider').addEventListener('change', (e) => {
            document.getElementById('api-key-container').style.display = e.target.value === 'copilot' ? 'none' : 'flex';
            notifyChange();
        });
        document.getElementById('apiKey').addEventListener('input', notifyChange);`;
const newListeners = `        document.getElementById('aiProvider').addEventListener('change', (e) => {
            document.getElementById('api-key-container').style.display = e.target.value === 'copilot' ? 'none' : 'flex';
            notifyChange();
        });
        document.getElementById('apiKeySubmit').addEventListener('click', () => {
            const apiKey = document.getElementById('apiKey').value;
            vscode.postMessage({ command: 'saveApiKeyQuick', apiKey: apiKey });
        });
        document.getElementById('apiKey').addEventListener('input', notifyChange);`;
code = code.replace(oldListeners, newListeners);

// Replace frontend message listener
const oldMessage = `        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'scrollTo') {`;
const newMessage = `        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'apiKeySaved') {
                const status = document.getElementById('apiKeyStatus');
                status.textContent = 'API Key saved perfectly!';
                setTimeout(() => { status.textContent = ''; }, 3000);
            }
            if (message.command === 'scrollTo') {`;
code = code.replace(oldMessage, newMessage);

fs.writeFileSync('src/ui/settingsPanel.ts', code);
console.log('Successfully patched settingsPanel.ts');
