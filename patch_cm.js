const fs = require('fs');
let cm = fs.readFileSync('src/config/configManager.ts', 'utf8');

// Remove historyMax block
cm = cm.replace(/                historyMax: this\.clamp\(\r?\n                    cfg\.get<number>\(CONFIG\.KEYS\.HISTORY_MAX, DEFAULTS\.HISTORY_MAX\),\r?\n                    VALIDATION\.HISTORY\.MIN,\r?\n                    VALIDATION\.HISTORY\.MAX\r?\n                \),\r?\n/, '');

// Remove statusBarCounter
cm = cm.replace(/                statusBarCounter: cfg\.get<boolean>\(CONFIG\.KEYS\.STATUS_BAR_COUNTER, true\),\r?\n/, '');

fs.writeFileSync('src/config/configManager.ts', cm);
console.log('Fixed configManager.ts');
