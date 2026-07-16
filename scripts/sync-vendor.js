/**
 * Copy webview assets from node_modules into resources/vendor for packaging.
 * Keeps the VSIX free of full @vscode package trees (src, build, .github, etc.).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const copies = [
    {
        from: path.join(root, 'node_modules', '@vscode', 'webview-ui-toolkit', 'dist', 'toolkit.min.js'),
        to: path.join(root, 'resources', 'vendor', 'webview-ui-toolkit', 'dist', 'toolkit.min.js')
    },
    {
        from: path.join(root, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css'),
        to: path.join(root, 'resources', 'vendor', 'codicons', 'dist', 'codicon.css')
    },
    {
        from: path.join(root, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.ttf'),
        to: path.join(root, 'resources', 'vendor', 'codicons', 'dist', 'codicon.ttf')
    }
];

for (const { from, to } of copies) {
    if (!fs.existsSync(from)) {
        console.error(`[vendor:sync] missing source: ${from}`);
        console.error('Run npm ci first so @vscode packages are installed as devDependencies.');
        process.exit(1);
    }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    console.log(`[vendor:sync] ${path.relative(root, to)}`);
}

console.log('[vendor:sync] done');
