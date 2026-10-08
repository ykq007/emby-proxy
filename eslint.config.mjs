// Lints the console's browser modules. Server-side src/**/*.js is Worker code and stays out of scope.
import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: ['worker.js', 'dist/**', 'public/**', 'node_modules/**'],
    },
    {
        files: ['src/ui/console/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                // Loaded by <script> tags (Sortable) or on demand (Chart).
                Sortable: 'readonly',
                Chart: 'readonly',
                // Replaced at build time by scripts/build-assets.mjs.
                __CURRENT_VERSION__: 'readonly',
                __GITHUB_RAW_URL__: 'readonly',
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
        },
    },
];
