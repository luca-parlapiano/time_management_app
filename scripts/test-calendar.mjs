import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const build = mkdtempSync(join(tmpdir(), 'time-calendar-test-'));
try {
  const compile = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--skipLibCheck', '--outDir', build, 'src/domain/calendar.ts', 'src/infrastructure/localCalendarStorage.ts'], { stdio: 'inherit' });
  if (compile.status !== 0) process.exitCode = compile.status ?? 1;
  else process.exitCode = spawnSync(process.execPath, ['--test', 'tests/calendar.test.cjs'], { stdio: 'inherit', env: { ...process.env, CALENDAR_TEST_BUILD: build } }).status ?? 1;
} finally { rmSync(build, { recursive: true, force: true }); }
