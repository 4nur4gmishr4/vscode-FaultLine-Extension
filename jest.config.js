/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }],
  },
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/test/__mocks__/vscode.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/test/**',
    '!src/**/*.d.ts',
    // Static webview HTML shells (logic covered via panel + pure helpers).
    '!src/presentation/ui/welcome.ts',
    '!src/presentation/ui/settingsPanel.ts',
    '!src/presentation/ui/errorExplanation.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  // Logic-path floor (HTML shells excluded above). Raise with new behavior.
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 55,
      lines: 60,
      statements: 60,
    },
  },
};
