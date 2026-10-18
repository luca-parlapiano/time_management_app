import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = mkdtempSync(join(tmpdir(), 'mindmorrow-series-'));

function fixture(habitCount, seriesCount, sessionsPerSeries) {
  const weeklyTimeHabits = [];
  const timeSessions = [];
  for (let habitIndex = 0; habitIndex < habitCount; habitIndex++) {
    const habitId = `habit-${habitIndex}`;
    const series = [];
    for (let seriesIndex = 0; seriesIndex < seriesCount; seriesIndex++) {
      const seriesId = `${habitId}:series-${seriesIndex}`;
      const sessionIds = [];
      for (let sessionIndex = 0; sessionIndex < sessionsPerSeries; sessionIndex++) {
        const id = `${seriesId}:session-${sessionIndex}`;
        sessionIds.push(id);
        timeSessions.push({ id, habitId, date: '2026-06-01', minutes: 30, removed: false });
      }
      series.push({ id: seriesId, startsOn: '2026-01-01', endsOn: '2026-12-31', targetMinutes: 120, period: 'month', sessionIds });
    }
    weeklyTimeHabits.push({ id: habitId, series });
  }
  return { weeklyTimeHabits, timeSessions };
}

try {
  const compiler = require.resolve('typescript/bin/tsc');
  const compilation = spawnSync(process.execPath, [compiler, '--ignoreConfig', '--module', 'commonjs', '--target', 'es2022',
    '--moduleResolution', 'node', '--ignoreDeprecations', '6.0', '--skipLibCheck', '--outDir', output,
    'src/core/domain/timeSeries.ts'], { cwd: root, encoding: 'utf8' });
  if (compilation.status !== 0) throw new Error(compilation.stderr || compilation.stdout || 'Compilazione del core non riuscita.');
  const { timeSeriesResults } = require(join(output, 'domain/timeSeries.js'));
  const archive = fixture(40, 12, 4);
  const referenceDate = '2026-10-18';
  const timings = [];
  for (let index = 0; index < 12; index++) {
    const start = performance.now();
    const results = timeSeriesResults(archive, referenceDate);
    timings.push(performance.now() - start);
    if (results.length !== 480 || results.some(result => result.completedMinutes !== 120)) throw new Error('Risultati del benchmark incoerenti.');
  }
  const steady = timings.slice(2).sort((a, b) => a - b);
  console.log(`480 serie, 1920 sessioni: mediana ${steady[4].toFixed(2)} ms; massimo ${steady.at(-1).toFixed(2)} ms`);
} finally {
  rmSync(output, { recursive: true, force: true });
}
