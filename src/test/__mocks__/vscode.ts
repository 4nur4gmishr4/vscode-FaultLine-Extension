const vscode = {
    window: {
        createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            append: jest.fn(),
            show: jest.fn(),
            dispose: jest.fn(),
        })),
        state: { focused: false },
        showErrorMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        createStatusBarItem: jest.fn(() => ({
            text: '',
            tooltip: '',
            command: '',
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
        })),
        onDidStartTerminalShellExecution: jest.fn(),
        onDidEndTerminalShellExecution: jest.fn(),
        onDidCloseTerminal: jest.fn(),
    },
    workspace: {
        getConfiguration: jest.fn(() => ({
            get: jest.fn(),
            update: jest.fn(),
        })),
        onDidChangeConfiguration: jest.fn(),
        workspaceFolders: [],
    },
    commands: {
        registerCommand: jest.fn(),
        executeCommand: jest.fn(),
    },
    ExtensionContext: jest.fn(),
    Disposable: {
        from: jest.fn(),
    },
    ThemeColor: jest.fn(),
    StatusBarAlignment: { Left: 1, Right: 2 },
    ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
};

module.exports = vscode;
