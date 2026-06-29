const fs = require('fs');
let code = fs.readFileSync('src/commands/soundCommands.ts', 'utf8');

const newCommand = `    disposables.push(
        vscode.commands.registerCommand('faultline.testSound', async (soundFile, volume) => {
            try {
                const path = require('path');
                let absolutePath = soundFile;
                if (!path.isAbsolute(soundFile)) {
                    absolutePath = path.join(ext.ctx.extensionPath, 'resources', 'packs', 'default', soundFile);
                }
                const vol = volume ? Number(volume) : ext.configManager.readConfig().audio.volume;
                await ext.player.play(absolutePath, { volume: vol });
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                void vscode.window.showErrorMessage('FaultLine playback failed: ' + msg);
            }
        }),

        vscode.commands.registerCommand('faultline.test', async () => {`;

code = code.replace(/    disposables\.push\(\r?\n        vscode\.commands\.registerCommand\('faultline\.test', async \(\) => {/, newCommand);

fs.writeFileSync('src/commands/soundCommands.ts', code);
console.log('Added faultline.testSound command');
