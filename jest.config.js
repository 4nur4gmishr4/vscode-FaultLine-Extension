// Coverage thresholds act as a regression gate, not an aspirational target.
// They are set to the current baseline (rounded down a few points for noise).
// As more tests are added, ratchet these upward to lock in the gain.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  moduleNameMapper: {
    '^vscode$': '<rootDir>/__mocks__/vscode.js'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  coverageThreshold: {
    global: {
      statements: 20,
      branches: 17,
      functions: 18,
      lines: 20
    }
  }
};