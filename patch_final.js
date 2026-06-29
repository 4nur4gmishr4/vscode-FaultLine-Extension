const fs = require('fs');

// src/runtime/faultline.ts
let fl = fs.readFileSync('src/runtime/faultline.ts', 'utf8');
fl = fl.replace(/this\.statusBar = new StatusBarManager\(configFn, this\.logger, ctx\.globalState\);\r?\n/, "this.statusBar = new StatusBarManager(configFn, this.logger);\n");
fs.writeFileSync('src/runtime/faultline.ts', fl);

// src/utils/history.ts
let hist = fs.readFileSync('src/utils/history.ts', 'utf8');
hist = hist.replace(/const max = this\.configManager\.readConfig\(\)\.core\.historyMax;/g, 'const max = 100;');
fs.writeFileSync('src/utils/history.ts', hist);

console.log('Fixed final 2 errors');
