import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'native/**/node_modules/**',
      'native/tauri/src-tauri/target/**',
      'native/tauri/src-tauri/gen/**',
      'native/electron/dist/**',
      'native/wails/build/**',
      'playwright-report/**',
      'test-results/**',
      'tests/servo/bin/**',
      'public_html/library/wasm/toolchains/**',
      'public_html/codemirror/vendor/**',
      'public_html/tsumiki/vendor/**',
      'public_html/ruby-wasm/vendor/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['public_html/**/*-worklet.js'],
    languageOptions: {
      globals: {
        // AudioWorkletGlobalScope names. Declared per-file because `globals`
        // v17 moved them out of `browser` into `audioWorklet`, and globals
        // v16 has no `audioWorklet` key to spread.
        AudioWorkletProcessor: 'readonly',
        registerProcessor: 'readonly',
      },
    },
  },
];
