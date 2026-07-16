const vscode = {
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            append: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn(),
        })),
        state: { focused: false },
        showErrorMessage: jest.fn(() => Promise.resolve(undefined)),
        showWarningMessage: jest.fn(() => Promise.resolve(undefined)),
        showInformationMessage: jest.fn(() => Promise.resolve(undefined)),
        createStatusBarItem: jest.fn(() => ({
            text: '',
            tooltip: '',
            command: '',
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
        })),
        createWebviewPanel: jest.fn(() => ({
            webview: {
                html: '',
                cspSource: 'vscode-webview:',
                asWebviewUri: jest.fn((u: { toString?: () => string }) => u),
                onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
                postMessage: jest.fn()
            },
            onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
            reveal: jest.fn(),
            dispose: jest.fn()
        })),
        activeTextEditor: undefined,
        onDidStartTerminalShellExecution: jest.fn(() => ({ dispose: jest.fn() })),
        onDidEndTerminalShellExecution: jest.fn(() => ({ dispose: jest.fn() })),
        onDidCloseTerminal: jest.fn(() => ({ dispose: jest.fn() })),
    },
    workspace: {
        getConfiguration: jest.fn(() => ({
            get: jest.fn((_key: string, def?: unknown) => def),
            update: jest.fn(),
            inspect: jest.fn(),
        })),
        onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
        workspaceFolders: [],
        textDocuments: [],
    },
    commands: {
        registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
        executeCommand: jest.fn(),
    },
    tasks: {
        onDidStartTaskProcess: jest.fn(() => ({ dispose: jest.fn() })),
        onDidEndTaskProcess: jest.fn(() => ({ dispose: jest.fn() })),
    },
    languages: {
        onDidChangeDiagnostics: jest.fn(() => ({ dispose: jest.fn() })),
        getDiagnostics: jest.fn(() => []),
    },
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3,
    },
    ExtensionContext: jest.fn(),
    Disposable: {
        from: jest.fn((...items: { dispose: () => void }[]) => ({
            dispose: jest.fn(() => {
                for (const i of items) {
                    i.dispose();
                }
            }),
        })),
    },
    ThemeColor: jest.fn(),
    StatusBarAlignment: { Left: 1, Right: 2 },
    ViewColumn: { One: 1, Two: 2, Three: 3, Active: -1, Beside: -2 },
    ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
    env: {
        clipboard: { writeText: jest.fn(async () => undefined) }
    },
    Uri: {
        file: (p: string) => ({ fsPath: p, path: p, toString: () => p }),
        joinPath: (base: { fsPath?: string }, ...parts: string[]) => {
            const root = base.fsPath ?? '';
            const joined = [root, ...parts].filter(Boolean).join('/').replace(/\/+/g, '/');
            return { fsPath: joined, path: joined, toString: () => joined };
        },
    },
};

module.exports = vscode;
