const fs = require('fs');

// 1. Patch constants.ts
let consts = fs.readFileSync('src/config/constants.ts', 'utf8');
consts = consts.replace(/COOLDOWN_MS: 50,/, 'COOLDOWN_MS: 5000,');
if (!consts.includes('SUCCESS_SOUND:')) {
    consts = consts.replace(/SOUND_PACK: 'faultline.mp3',/, "SOUND_PACK: 'faultline.mp3',\n    /** Default success sound */\n    SUCCESS_SOUND: 'faultline.mp3',");
}
fs.writeFileSync('src/config/constants.ts', consts);

// 2. Patch configManager.ts
let cfgMgr = fs.readFileSync('src/config/configManager.ts', 'utf8');
if (!cfgMgr.includes('successSound: cfg.get<string>')) {
    cfgMgr = cfgMgr.replace(
        /successEnabled: cfg.get<boolean>\(CONFIG.KEYS.SUCCESS_ENABLED, false\),/,
        "successEnabled: cfg.get<boolean>(CONFIG.KEYS.SUCCESS_ENABLED, false),\n                successSound: cfg.get<string>(CONFIG.KEYS.SUCCESS_SOUND, DEFAULTS.SUCCESS_SOUND),"
    );
}
fs.writeFileSync('src/config/configManager.ts', cfgMgr);

// 3. Patch settingsPanel.ts
let ui = fs.readFileSync('src/ui/settingsPanel.ts', 'utf8');
const errorHtml = `                <label class="setting-label">Sound Pack</label>
                <div class="setting-description">Choose the personality of your notifications.</div>
                <div style="display: flex; gap: 8px;">
                    <vscode-dropdown id="soundPack" style="flex: 1;">
                        <vscode-option value="faultline.mp3" \${config.audio.soundPack === 'faultline.mp3' ? 'selected' : ''}>Classic FaultLine</vscode-option>
                        <vscode-option value="faultlinehard.mp3" \${config.audio.soundPack === 'faultlinehard.mp3' ? 'selected' : ''}>Impact Strike</vscode-option>
                        <vscode-option value="fartreverb.mp3" \${config.audio.soundPack === 'fartreverb.mp3' ? 'selected' : ''}>Reverb Blast</vscode-option>
                        <vscode-option value="faultlinedeep.mp3" \${config.audio.soundPack === 'faultlinedeep.mp3' ? 'selected' : ''}>Deep Resonance</vscode-option>
                        <vscode-option value="faultlinebroke.mp3" \${config.audio.soundPack === 'faultlinebroke.mp3' ? 'selected' : ''}>System Crash</vscode-option>
                        <vscode-option value="ohshit.mp3" \${config.audio.soundPack === 'ohshit.mp3' ? 'selected' : ''}>Quick Expletive</vscode-option>
                    </vscode-dropdown>
                    <vscode-button id="testErrorSoundBtn" appearance="secondary"><span class="codicon codicon-play"></span> Play</vscode-button>
                </div>`;

ui = ui.replace(/<label class="setting-label">Sound Pack<\/label>[\s\S]*?<\/vscode-dropdown>/, errorHtml);

const successHtml = `                <vscode-checkbox id="successEnabled" \${config.audio.successEnabled ? 'checked' : ''}>Success Sounds</vscode-checkbox>
                <div class="setting-description">Celebrate your victories! Plays a short tone when a build or test passes.</div>
                <div style="display: flex; gap: 8px; margin-top: 8px; align-items: center;" id="success-sound-container">
                    <label class="setting-label">Success Sound:</label>
                    <vscode-dropdown id="successSound" style="flex: 1;">
                        <vscode-option value="faultline.mp3" \${config.audio.successSound === 'faultline.mp3' ? 'selected' : ''}>Classic Success</vscode-option>
                        <vscode-option value="fartreverb.mp3" \${config.audio.successSound === 'fartreverb.mp3' ? 'selected' : ''}>Victory Reverb</vscode-option>
                        <vscode-option value="ohshit.mp3" \${config.audio.successSound === 'ohshit.mp3' ? 'selected' : ''}>Short Beep</vscode-option>
                    </vscode-dropdown>
                    <vscode-button id="testSuccessSoundBtn" appearance="secondary"><span class="codicon codicon-play"></span> Play</vscode-button>
                </div>`;

ui = ui.replace(/<vscode-checkbox id="successEnabled"[^>]*>Success Sounds<\/vscode-checkbox>\s*<div class="setting-description">[^<]*<\/div>/, successHtml);

// Add the notifyChange keys
ui = ui.replace(/soundPack: document.getElementById\('soundPack'\).value,/, "soundPack: document.getElementById('soundPack').value,\n                successSound: document.getElementById('successSound').value,");

// Add frontend listeners
const frontendListeners = `
        document.getElementById('soundPack').addEventListener('change', notifyChange);
        document.getElementById('successSound').addEventListener('change', notifyChange);
        document.getElementById('successEnabled').addEventListener('change', (e) => {
            document.getElementById('success-sound-container').style.opacity = e.target.checked ? '1' : '0.5';
            document.getElementById('success-sound-container').style.pointerEvents = e.target.checked ? 'auto' : 'none';
            notifyChange();
        });
        
        document.getElementById('testErrorSoundBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'testSound', sound: document.getElementById('soundPack').value, volume: document.getElementById('volume').value });
        });
        document.getElementById('testSuccessSoundBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'testSound', sound: document.getElementById('successSound').value, volume: document.getElementById('volume').value });
        });
`;

ui = ui.replace(/document.getElementById\('soundPack'\).addEventListener\('change', notifyChange\);\s*document.getElementById\('successEnabled'\).addEventListener\('change', notifyChange\);/, frontendListeners);

// Add backend message handler for 'testSound'
const backendTestSound = `
                    case 'testSound':
                        vscode.commands.executeCommand('faultline.testSound', message.sound, message.volume);
                        return;
                    case 'reset':`;
ui = ui.replace(/case 'reset':/, backendTestSound);

fs.writeFileSync('src/ui/settingsPanel.ts', ui);
console.log('Patched all files successfully');
