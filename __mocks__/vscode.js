module.exports = {
  window: {
    createWebviewPanel: jest.fn(() => ({
      webview: {
        html: '',
        onDidReceiveMessage: jest.fn(),
        asWebviewUri: jest.fn(uri => uri.path)
      },
      onDidDispose: jest.fn(),
      reveal: jest.fn(),
      dispose: jest.fn()
    })),
    activeTextEditor: undefined
  },
  ViewColumn: {
    One: 1
  },
  Uri: {
    file: jest.fn(f => ({ path: f, scheme: 'file' })),
    joinPath: jest.fn((base, ...paths) => ({ path: base.path + '/' + paths.join('/'), scheme: 'file' }))
  },
  commands: {
    executeCommand: jest.fn()
  }
};