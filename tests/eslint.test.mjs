import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';

const eslint = new ESLint();
async function rules(code, filePath) {
  const [result] = await eslint.lintText(code, { filePath });
  assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
  return result.messages.map(message => message.ruleId);
}

test('renderer rejects Node/Electron imports, including dynamic imports', async () => {
  const found = await rules("import fs from 'node:fs'; import { ipcRenderer } from 'electron'; export const api = [fs, ipcRenderer]; void import('fs');", 'src/main.tsx');
  assert.ok(found.includes('no-restricted-imports'));
  assert.ok(found.includes('no-restricted-syntax'));
  assert.ok((await rules('export const env = process.env;', 'src/main.tsx')).includes('no-restricted-globals'));
});

test('main can import Node but cannot disable window isolation', async () => {
  assert.deepEqual(await rules("import path from 'node:path'; export const name = path.basename('/tmp/file');", 'electron/main.ts'), []);
  const found = await rules('export const webPreferences = {nodeIntegration: true, contextIsolation: false};', 'electron/main.ts');
  assert.equal(found.filter(rule => rule === 'no-restricted-syntax').length, 2);
});

test('preload allows the narrow bridge and rejects main-process imports', async () => {
  assert.deepEqual(await rules("import {contextBridge, ipcRenderer} from 'electron'; contextBridge.exposeInMainWorld('test', {read: () => ipcRenderer.invoke('read')});", 'electron/preload.cts'), []);
  assert.ok((await rules("import {BrowserWindow} from 'electron'; export const api = BrowserWindow;", 'electron/preload.cts')).includes('no-restricted-imports'));
  assert.ok((await rules("import fs from 'node:fs'; export const api = fs;", 'electron/preload.cts')).includes('no-restricted-imports'));
});

test('typed lint catches unhandled promises and invalid Hooks', async () => {
  assert.ok((await rules('Promise.resolve(1);', 'src/main.tsx')).includes('@typescript-eslint/no-floating-promises'));
  assert.ok((await rules("import {useState} from 'react'; export function Demo({enabled}: {enabled: boolean}) { if (enabled) useState(0); return null; }", 'src/main.tsx')).includes('react-hooks/rules-of-hooks'));
});

test('Node scripts and browser tests have separate globals', async () => {
  assert.deepEqual(await rules('console.log(process.cwd());', 'scripts/test-calendar.mjs'), []);
  assert.deepEqual(await rules('document.title = "Test";', 'tests/legacyMigration.browser.ts'), []);
});
