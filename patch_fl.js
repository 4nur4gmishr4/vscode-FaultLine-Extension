const fs = require('fs');

let fl = fs.readFileSync('src/runtime/faultline.ts', 'utf8');

// Line 17
fl = fl.replace(/import \{ AIService, WebhookService, GamificationService \} from '\.\.\/services';\r?\n/, "import { AIService, WebhookService } from '../services';\n");

// Handle success logic
fl = fl.replace(/            const streakMsg = await this\.gamification\.recordSuccess\(\);\r?\n            if \(streakMsg\) \{\r?\n                void vscode\.window\.showInformationMessage\(streakMsg\);\r?\n            \}\r?\n/, '');

// Dispose
fl = fl.replace(/        this\.gamification\.dispose\(\);\r?\n/, '');

fs.writeFileSync('src/runtime/faultline.ts', fl);
console.log('Fixed faultline.ts');
