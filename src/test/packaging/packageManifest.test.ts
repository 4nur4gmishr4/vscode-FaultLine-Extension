import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
    name: string;
    displayName: string;
    publisher: string;
    main: string;
    engines: { vscode: string };
    keywords?: string[];
    activationEvents?: string[];
    contributes: {
        commands: { command: string; title?: string; category?: string }[];
        walkthroughs?: unknown[];
        configuration: { properties: Record<string, { pattern?: string }> };
    };
};

describe('package manifest (packaging / activation smoke)', () => {
    it('keeps Marketplace identity (downloads) and FaultLine display name', () => {
        // Never rename `name` or `publisher` — that creates a new Marketplace extension and loses history/downloads.
        expect(pkg.name).toBe('fahh');
        expect(pkg.publisher).toBe('4nur4gmishr4');
        expect(pkg.displayName).toBe('FaultLine');
        expect(pkg.keywords).toEqual(expect.arrayContaining(['FaultLine', 'faultline', 'fahh']));
        const sample = pkg.contributes.commands.find((c) => c.command === 'faultline.toggle');
        expect(sample?.category).toBe('FaultLine');
    });

    it('declares entrypoint and activation', () => {
        expect(pkg.main).toBe('./out/extension.js');
        // Keep onStartupFinished for detectors + explicit onCommand for reliable palette activation.
        expect(pkg.activationEvents).toEqual(expect.arrayContaining(['onStartupFinished']));
        expect(pkg.activationEvents).toEqual(
            expect.arrayContaining(['onCommand:faultline.toggle', 'onCommand:faultline.openSettings'])
        );
        expect(pkg.engines.vscode).toMatch(/^\^1\./);
    });

    it('contributes critical commands used by runtime UI', () => {
        const ids = new Set(pkg.contributes.commands.map((c) => c.command));
        for (const id of [
            'faultline.test',
            'faultline.toggle',
            'faultline.openSettings',
            'faultline.explainError',
            'faultline.factoryReset',
            'faultline.testSound'
        ]) {
            expect(ids.has(id)).toBe(true);
        }
    });

    it('has no walkthroughs without media (or walkthroughs removed)', () => {
        const walks = pkg.contributes.walkthroughs ?? [];
        expect(walks).toEqual([]);
    });

    it('requires https for webhook URLs', () => {
        const pattern = pkg.contributes.configuration.properties['faultline.webhookUrl']?.pattern;
        expect(pattern).toContain('https://');
        expect(pattern).not.toMatch(/https\?/);
    });

    it('defaults AI auto-show and Jira create to off', () => {
        const props = pkg.contributes.configuration.properties as Record<
            string,
            { default?: unknown }
        >;
        expect(props['faultline.errorExplanation.autoShow']?.default).toBe(false);
        expect(props['faultline.jiraEnabled']?.default).toBe(false);
    });

    it('uses nls for explainError and openSettings command titles', () => {
        const cmds = pkg.contributes.commands;
        const explain = cmds.find((c) => c.command === 'faultline.explainError');
        const settings = cmds.find((c) => c.command === 'faultline.openSettings');
        expect(explain?.title).toMatch(/%command\.faultline\.explainError%/);
        expect(settings?.title).toMatch(/%command\.faultline\.openSettings%/);
    });

    it('extension entry module exists after compile (soft)', () => {
        const mainPath = path.join(root, pkg.main);
        if (!fs.existsSync(mainPath)) {
            // Local checkout may not have run compile; soft assert on manifest only.
            expect(pkg.main).toBe('./out/extension.js');
            return;
        }
        const text = fs.readFileSync(mainPath, 'utf8');
        expect(text).toMatch(/activate/);
        expect(text.length).toBeGreaterThan(1000);
    });

    it('packages webview assets from resources/vendor (not node_modules)', () => {
        const ignore = fs.readFileSync(path.join(root, '.vscodeignore'), 'utf8');
        expect(ignore).toMatch(/node_modules\/\*\*/);
        const vendorToolkit = path.join(
            root,
            'resources',
            'vendor',
            'webview-ui-toolkit',
            'dist',
            'toolkit.min.js'
        );
        const vendorCodicon = path.join(root, 'resources', 'vendor', 'codicons', 'dist', 'codicon.css');
        // Soft: files exist after vendor:sync / package:prod
        if (fs.existsSync(vendorToolkit) && fs.existsSync(vendorCodicon)) {
            expect(fs.statSync(vendorToolkit).size).toBeGreaterThan(1000);
            expect(fs.statSync(vendorCodicon).size).toBeGreaterThan(100);
        } else {
            expect(ignore).toMatch(/node_modules/);
        }
    });
});
