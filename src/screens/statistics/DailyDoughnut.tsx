import { percentage } from "../../utils/math.js";
import { ArcElement, Chart, DoughnutController, Tooltip } from 'chart.js';
import { useEffect, useRef } from 'react';
import { eventColors } from '../../domain/calendar';
import type { DailyStatistics } from '../../model/statistics.js';

interface DailyDoughnutProps { statistics: DailyStatistics; compact?: boolean }

Chart.register(DoughnutController, ArcElement, Tooltip);
export function DailyDoughnut({statistics, compact = false}: DailyDoughnutProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const {total, activities, date, recorded, completed, completionPercent} = statistics;
  const percent = (value: number) => `${new Intl.NumberFormat('it-IT', {maximumFractionDigits: 1}).format(value)}%`;
  useEffect(() => {
    const element = canvas.current;
    if (!element || !recorded) return;
    const contributions = activities.filter(item => item.completed > 0);
    const remaining = total - completed;
    let chart: Chart<'doughnut'> | undefined;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || chart) return;
      chart = new Chart(element, {
        type: 'doughnut',
        data: {
          labels: [...contributions.map(item => item.title), ...(remaining ? ['Non completate'] : [])],
          datasets: [{data: [...contributions.map(item => item.completed), ...(remaining ? [remaining] : [])], backgroundColor: [...contributions.map(item => eventColors[item.color].value), ...(remaining ? ['rgba(137,148,167,.3)'] : [])], borderWidth: 0, spacing: compact ? 0 : 2}],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '68%', animation: false,
          events: compact ? [] : ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
          plugins: {tooltip: {enabled: !compact && total > 0, callbacks: {label: context => `${context.label}: ${context.parsed} (${percent(percentage(context.parsed, total))})`}}},
        },
      });
      observer.disconnect();
    });
    observer.observe(element);
    return () => {observer.disconnect(); chart?.destroy();};
  }, [statistics, compact, total, activities, recorded, completed]);
  const summary = `${date}: ${percent(completionPercent)} completato, ${completed} su ${total} attività superate. ${activities.map(item => `${item.title}: ${percent(item.contributionPercent)} della giornata`).join(', ')}`;
  if (!recorded) return <span className={compact ? 'annual-event-dots' : 'daily-pending'}>
    <span className="daily-pending-dots" aria-label="Attività pianificate senza esiti">{[...new Set(activities.map(item => item.color))].map(color => <i key={color} style={{backgroundColor: eventColors[color].value}} />)}</span>
    {!compact && <small>{total ? `${total} attività pianificate · Nessun esito registrato` : 'Nessuna attività pianificata'}</small>}
  </span>;
  return <span className={`daily-chart${compact ? ' daily-chart-compact' : ''}`}>
    <span className="daily-doughnut">
      <canvas ref={canvas} role={compact ? undefined : 'img'} aria-hidden={compact || undefined} aria-label={compact ? undefined : summary}>{summary}</canvas>
      <span className="daily-doughnut-total" aria-hidden="true">{percent(completionPercent)}</span>
    </span>
    {!compact && <span className="daily-chart-legend">
      {activities.map(item => <span key={item.key}><i style={{backgroundColor: eventColors[item.color].value}} aria-hidden="true" /><span>{item.title}</span><strong>{percent(item.contributionPercent)}</strong></span>)}
      <small>{completed}/{total} attività superate · {statistics.skipped} non superate · {statistics.pending} senza esito. Le percentuali indicano il contributo al totale della giornata.</small>
    </span>}
  </span>;
}
