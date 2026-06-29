const fs = require('fs');

// src/extension.ts
let extLines = fs.readFileSync('src/extension.ts', 'utf8').split('\n');
let newExtLines = [];
let skipExt = 0;
for (let i = 0; i < extLines.length; i++) {
    if (skipExt > 0) { skipExt--; continue; }
    if (extLines[i].includes('gamification.recordFailure()')) {
        // Drop the /// @ts-ignore if it's there
        if (newExtLines.length > 0 && newExtLines[newExtLines.length - 1].includes('@ts-ignore')) {
            newExtLines.pop();
        }
        continue;
    }
    newExtLines.push(extLines[i]);
}
fs.writeFileSync('src/extension.ts', newExtLines.join('\n'));

// src/runtime/faultline.ts
let flLines = fs.readFileSync('src/runtime/faultline.ts', 'utf8').split('\n');
let newFlLines = [];
let skipFl = 0;
for (let i = 0; i < flLines.length; i++) {
    if (skipFl > 0) { skipFl--; continue; }
    let line = flLines[i];
    if (line.includes("import { GamificationService } from '../services';")) continue;
    if (line.includes("public readonly gamification: GamificationService;")) continue;
    if (line.includes("this.gamification = new GamificationService(this.configManager, this.stateStore, this.logger);")) continue;
    
    // The bossMsg blocks
    if (line.includes("const bossMsg = await this.gamification.recordFailure();") ||
        line.includes("const bossMsg = await this.gamification.recordSuccess();")) {
        skipFl = 4; // skip this and next 4 lines (if (bossMsg) { window.showInformationMessage... })
        continue;
    }
    
    // Also src/runtime/faultline.ts(56,70): error TS2554: Expected 2 arguments, but got 3.
    // This is from `new StatusBarManager(..., ..., ...)` - I need to remove the third argument from `new StatusBarManager(..., this.logger, this.stateStore);`
    if (line.includes("this.statusBar = new StatusBarManager(")) {
        line = line.replace(/this\.statusBar = new StatusBarManager\(\(\) => this\.configManager\.readConfig\(\), this\.logger, this\.stateStore\);/, 
                            "this.statusBar = new StatusBarManager(() => this.configManager.readConfig(), this.logger);");
    }

    newFlLines.push(line);
}
fs.writeFileSync('src/runtime/faultline.ts', newFlLines.join('\n'));

// src/utils/history.ts
let hist = fs.readFileSync('src/utils/history.ts', 'utf8');
hist = hist.replace(/const max = this\.configManager\.readConfig\(\)\.core\.historyMax;/g, 'const max = 100;');
fs.writeFileSync('src/utils/history.ts', hist);

console.log('Fixed remaining files safely');
