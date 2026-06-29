const fs = require('fs');
let sb = fs.readFileSync('src/ui/statusBar.ts', 'utf8');

// The original line is something like:
// const counter = cfg.statusBarCounter ? ` • ${count}` : '';
sb = sb.replace(/const count = this\.state \? this\.state\.get<number>\('faultline\.dailyFailCount', 0\) : 0;\r?\n/, '');
sb = sb.replace(/const counter = cfg\.statusBarCounter \? ` • \$\{count\}` : '';\r?\n/, '');
sb = sb.replace(/\$\{counter\}/g, '');

// The methods to delete
sb = sb.replace(/    public getFailCount\(\): number \{\r?\n        return this\.state \? this\.state\.get<number>\('faultline\.dailyFailCount', 0\) : 0;\r?\n    \}\r?\n/, '');
sb = sb.replace(/    public resetCounter\(\): void \{\r?\n        this\.state\?\.update\('faultline\.dailyFailCount', 0\);\r?\n        this\.refresh\(\);\r?\n    \}\r?\n/, '');

fs.writeFileSync('src/ui/statusBar.ts', sb);
console.log('Cleaned statusBar.ts successfully');
