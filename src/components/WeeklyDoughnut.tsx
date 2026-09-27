import { weeklyOutcomeLabels as labels, weeklyOutcomeColors as colors } from "../constants.js";
import { percentage } from "../utils/math.js";
import { ArcElement, Chart, DoughnutController, Tooltip } from 'chart.js';
import { useEffect, useRef } from 'react';
import type { WeeklyActivityStatistics } from '../model/statistics.js';

interface WeeklyDoughnutProps {
  title: string;
  statistics: WeeklyActivityStatistics;
}

Chart.register(DoughnutController, ArcElement, Tooltip);

export function WeeklyDoughnut({ title, statistics }: WeeklyDoughnutProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { completed, skipped, partial, pending, total, recorded } = statistics;
  useEffect(() => {
    if (!canvas.current) return;
    const empty = total === 0;
    const chart = new Chart(canvas.current, {
      type: 'doughnut',
      data: {
        labels: empty ? ['Nessun appuntamento'] : labels,
        datasets: [{
          data: empty ? [1] : [completed, skipped, partial, pending],
          backgroundColor: empty ? ['rgba(137, 148, 167, 0.22)'] : colors,
          borderWidth: 0,
          spacing: empty ? 0 : 2,
          hoverOffset: empty ? 0 : 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '76%',
        animation: false,
        layout: { padding: 4 },
        plugins: {
          tooltip: {
            enabled: !empty,
            displayColors: true,
            callbacks: {
              label: context => `${context.label}: ${context.parsed} (${Math.round(percentage(context.parsed, total))}%)`,
            },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [completed, skipped, partial, pending, total]);

  const values = [completed, skipped, partial, pending];
  const summary = `${title}: ${completed} superate, ${skipped} non superate, ${partial} parziali, ${pending} senza esito. ${total} appuntamenti nella settimana.`;
  return <div className="weekly-doughnut-summary">
    <div className="weekly-doughnut">
      <canvas ref={canvas} role="img" aria-label={summary}>{summary}</canvas>
      <div className="weekly-doughnut-center" aria-hidden="true"><strong>{total}</strong><small>totali</small></div>
    </div>
    <div className="weekly-doughnut-detail">
      <ul className="weekly-doughnut-legend" aria-label={`Esiti settimanali di ${title}`}>
        {labels.map((label, index) => <li key={label}><i style={{ backgroundColor: colors[index] }} aria-hidden="true" /><span>{label}</span><strong>{values[index]}</strong></li>)}
      </ul>
      <p>{total === 0 ? 'Nessun appuntamento' : `${recorded}/${total} esiti registrati`}</p>
    </div>
  </div>;
}
