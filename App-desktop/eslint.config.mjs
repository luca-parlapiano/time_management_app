import { builtinModules } from 'node:module';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const typescriptFiles = ['src/**/*.{ts,tsx}', 'electron/**/*.{ts,cts}', 'tests/**/*.{ts,tsx}', 'vite.config.ts'];
const nodeImports = [...new Set(builtinModules.map(name => name.replace(/^node:/, '')))];

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', 'dist-electron/**', 'resources/**', 'ai-lab/**'] },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,cts}'],
    extends: [js.configs.recommended],
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
  {
    files: typescriptFiles,
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: { project: './tsconfig.eslint.json', tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      // Gli handler React async sono ammessi; devono gestire gli errori al loro interno.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
      '@typescript-eslint/await-thenable': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.browser.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'no-restricted-globals': ['error', 'process', 'Buffer', 'require', '__dirname', '__filename', 'module', 'exports'],
      'no-restricted-imports': ['error', {
        paths: [...nodeImports, 'electron', '@electron/remote'],
        patterns: ['node:*', '**/electron/**'],
      }],
      'no-restricted-syntax': ['error',
        { selector: 'ImportExpression[source.value=/^node:/]', message: 'Il renderer usa il bridge preload, non importa API Node.' },
        ...[...nodeImports, 'electron', '@electron/remote'].map(name => ({
          selector: `ImportExpression[source.value='${name}']`,
          message: 'Il renderer usa il bridge preload, non importa API Node/Electron.',
        })),
      ],
    },
  },
  {
    files: ['electron/**/*.{ts,cts}'],
    languageOptions: { globals: globals.node },
    rules: {
      'no-restricted-syntax': ['error',
        { selector: "Property[key.name='nodeIntegration'][value.value=true]", message: 'Mantieni nodeIntegration disabilitato nel renderer.' },
        { selector: "Property[key.name='contextIsolation'][value.value=false]", message: 'Mantieni contextIsolation abilitato.' },
      ],
    },
  },
  {
    files: ['electron/preload.cts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['*', '!electron'], message: 'Il preload sandboxed espone solo il bridge Electron.' }],
        paths: [{ name: 'electron', importNames: ['app', 'BrowserWindow', 'ipcMain', 'shell', 'remote'], message: 'Queste API appartengono al main process.' }],
      }],
    },
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs}', 'tests/**/*.{mjs,cjs}', '*.config.{ts,mjs}'],
    languageOptions: { globals: globals.node },
  },
  { files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs' } },
);
