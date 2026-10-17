import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const desktopRoot = resolve(mobileRoot, '../App-desktop/src');
const destinationRoot = resolve(mobileRoot, 'src/core');
const files = ['constants.ts', 'repository/StatisticsRepository.ts'];
for (const directory of ['domain', 'model', 'utils']) {
  const names = await readdir(join(desktopRoot, directory));
  files.push(...names.filter(name => name.endsWith('.ts')).map(name => `${directory}/${name}`));
}

/** Adatta soltanto gli import NodeNext e l'UUID al runtime Metro/Expo. */
function mobileSource(relativePath, source) {
  let next = source.replace(/(\.\.?\/[^'"\s]+)\.js(?=['"])/g, '$1');
  if (relativePath === 'domain/outcomeArchive.ts') {
    next = `import { randomUUID as expoRandomUUID } from 'expo-crypto';\n${next.replaceAll('crypto.randomUUID()', 'expoRandomUUID()')}`;
  }
  return `// Generato da scripts/sync-core.mjs: modificare il sorgente in App-desktop.\n${next}`;
}

const check = process.argv.includes('--check');
const changed = [];
for (const relativePath of files) {
  const destination = join(destinationRoot, relativePath);
  const expected = mobileSource(relativePath, await readFile(join(desktopRoot, relativePath), 'utf8'));
  let current = '';
  try { current = await readFile(destination, 'utf8'); } catch { /* File non ancora generato. */ }
  if (current === expected) continue;
  changed.push(relativePath);
  if (!check) {
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, expected);
  }
}
if (check && changed.length) {
  console.error(`Core mobile non allineato: ${changed.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(check ? `Core mobile allineato (${files.length} file).` : `Core mobile sincronizzato (${files.length} file).`);
}
