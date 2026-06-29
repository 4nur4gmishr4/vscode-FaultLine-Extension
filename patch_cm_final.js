const fs = require('fs');

let lines = fs.readFileSync('src/config/configManager.ts', 'utf8').split('\n');
let newLines = [];
let skipLines = 0;

for (let i = 0; i < lines.length; i++) {
    if (skipLines > 0) {
        skipLines--;
        continue;
    }
    const line = lines[i];

    if (line.includes('historyMax: this.clamp(')) {
        skipLines = 4;
        continue;
    }
    if (line.includes('CONFIG.KEYS.DAILY_SUMMARY') || 
        line.includes('CONFIG.KEYS.STREAK_COUNTER') || 
        line.includes('CONFIG.KEYS.STATUS_BAR_COUNTER')) {
        continue;
    }
    if (line.includes('CONFIG.KEYS.BOSS_FIGHT_MODE')) {
        // Need to remove the comma from the PREVIOUS line since bossFightMode was the last element
        if (newLines[newLines.length - 1].trim().endsWith(',')) {
            newLines[newLines.length - 1] = newLines[newLines.length - 1].replace(/,$/, '');
        } else {
            // Check if there's an invisible \r
            if (newLines[newLines.length - 1].endsWith(',\r')) {
                newLines[newLines.length - 1] = newLines[newLines.length - 1].replace(/,\r$/, '\r');
            }
        }
        continue;
    }

    newLines.push(line);
}

fs.writeFileSync('src/config/configManager.ts', newLines.join('\n'));
console.log('Fixed configManager.ts properly');
