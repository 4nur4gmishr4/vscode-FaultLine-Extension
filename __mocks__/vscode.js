const vscode = {
  window: {
    createWebviewPanel: jest.fn(() => ({
      webview: {
        html: '',
        onDidReceiveMessage: jest.fn(),
        postMessage: jest.fn(),
        asWebviewUri: jest.fn(uri => uri.path)
      },
      onDidDispose: jest.fn(),
      reveal: jest.fn(),
      dispose: jest.fn()
    })),
    createStatusBarItem: jest.fn(() => ({
      text: '',
      tooltip: '',
      command: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn()
    })),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    activeTextEditor: undefined,
    state: { focused: false },
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
      clear: jest.fn()
    })),
    onDidChangeDiagnostics: jest.fn(() => ({ dispose: jest.fn() })),
    onDidCloseTerminal: jest.fn(() => ({ dispose: jest.fn() })),
    onDidEndTerminalShellExecution: jest.fn(() => ({ dispose: jest.fn() }))
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key, defaultValue) => defaultValue),
      update: jest.fn(),
      has: jest.fn()
    })),
    onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
    fs: {
      stat: jest.fn(),
      writeFile: jest.fn()
    },
    textDocuments: []
  },
  languages: {
    getDiagnostics: jest.fn(() => []),
    onDidChangeDiagnostics: jest.fn(() => ({ dispose: jest.fn() }))
  },
  tasks: {
    onDidStartTaskProcess: jest.fn(() => ({ dispose: jest.fn() })),
    onDidEndTaskProcess: jest.fn(() => ({ dispose: jest.fn() }))
  },
  ViewColumn: {
    One: 1,
    Beside: 2
  },
  Uri: {
    file: jest.fn(f => ({ path: f, scheme: 'file', toString: () => f })),
    joinPath: jest.fn((base, ...paths) => ({ path: base.path + '/' + paths.join('/'), scheme: 'file', toString: () => base.path + '/' + paths.join('/') })),
    parse: jest.fn(s => ({ path: s, scheme: 'file' }))
  },
  commands: {
    executeCommand: jest.fn(),
    registerCommand: jest.fn(() => ({ dispose: jest.fn() }))
  },
  EventEmitter: class {
    constructor() { this.event = jest.fn(); }
    fire() {}
    dispose() {}
  },
  TreeItem: class {
    constructor(label) { this.label = label; }
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3
  },
  Disposable: {
    from: jest.fn((...disposables) => ({ dispose: () => disposables.forEach(d => d.dispose()) }))
  },
  CancellationTokenSource: class {
    constructor() { this.token = {}; }
    dispose() {}
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2
  }
};

module.exports = vscode;
