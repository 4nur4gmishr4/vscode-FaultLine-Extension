/**
 * ESLint configuration for the Fahh extension.
 *
 * Layout:
 *   - The root config is type-aware-free, so it lints any TypeScript file
 *     including tests (which are excluded from the project's tsconfig).
 *   - The `src/**` override enables typed-linting and adds the rules that
 *     actually need type information (no-floating-promises, etc.).
 *
 * Rule levels are tuned to the *current* code so the lint pass is green out
 * of the box. Ratchet `warn` -> `error` as the codebase tightens.
 */
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2022
    },
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
    ],
    env: {
        node: true,
        es2022: true,
        jest: true
    },
    ignorePatterns: [
        'out/**',
        'coverage/**',
        'node_modules/**',
        'resources/**',
        '__mocks__/**',
        '*.js',
        '*.cjs',
        '*.mjs'
    ],
    rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['warn', {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_'
        }],
        'no-unused-vars': 'off'
    },
    overrides: [
        {
            // Production source: enable type-aware linting.
            files: ['src/**/*.ts'],
            excludedFiles: ['src/**/*.test.ts', 'src/__tests__/**/*.ts'],
            parserOptions: {
                project: ['./tsconfig.json'],
                tsconfigRootDir: __dirname
            },
            extends: [
                'plugin:@typescript-eslint/recommended-requiring-type-checking'
            ],
            rules: {
                // --- Bug-catching ---------------------------------------------
                '@typescript-eslint/no-floating-promises': 'error',
                '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
                '@typescript-eslint/await-thenable': 'error',
                '@typescript-eslint/no-for-in-array': 'error',
                '@typescript-eslint/no-unnecessary-type-assertion': 'error',
                '@typescript-eslint/prefer-nullish-coalescing': 'warn',
                '@typescript-eslint/prefer-optional-chain': 'warn',
                // --- Loosened (warn) for the current codebase -----------------
                '@typescript-eslint/no-unsafe-argument': 'warn',
                '@typescript-eslint/no-unsafe-assignment': 'warn',
                '@typescript-eslint/no-unsafe-member-access': 'warn',
                '@typescript-eslint/no-unsafe-call': 'warn',
                '@typescript-eslint/no-unsafe-return': 'warn',
                '@typescript-eslint/restrict-template-expressions': 'warn'
            }
        }
    ]
};
