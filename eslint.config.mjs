// ESLint flat config — issue #20: the dashboard client script is now a real
// .js source file (src/ui/dashboard/client/app.js), no longer a template
// literal, so it can finally be linted. Scoped to the client sources that
// actually ship to the browser; server-side src/**/*.js is Worker code
// (different runtime/globals) and stays out of scope for this pass.
import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: ['worker.js', 'dist/**', 'public/**', 'node_modules/**'],
    },
    {
        files: ['src/ui/dashboard/client/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                // Third-party globals loaded via <script> tags in the dashboard
                // HTML shell before app.js runs (see src/ui/dashboard.js).
                Sortable: 'readonly',
                Chart: 'readonly',
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
        },
    },
];
