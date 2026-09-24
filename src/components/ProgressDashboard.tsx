import { percentage } from "../utils/math.js";
import { useEffect, useState } from "react";
import type { CalendarActivity, WeeklyPlan } from "../model/planning.js";
import type { DashboardEvent, DashboardMode, ProgressChartProps, ProgressDashboardProps, ProgressRow } from "../model/ProgressDashboard.js";

function getFocusWindow(start: string) {
  const hour = Number(start.split(":")[0]);
  if (hour < 12) return "Mattina";
  if (hour < 18) return "Pomeriggio";
  return "Sera";
}

function getRows(plan: WeeklyPlan, events: DashboardEvent[], getLabel: (block: CalendarActivity) => string) {
  const groups = new Map<string, ProgressRow>();

  for (const event of events) {
    if (event.outcome !== "completed" && event.outcome !== "skipped") continue;

    const block = plan.blocks.find((candidate) => candidate.id === event.blockId);
    if (!block || block.kind !== "focus") continue;

    const label = getLabel(block);
    const row = groups.get(label) ?? { label, completed: 0, attempted: 0 };
    row.attempted += 1;
    row.completed += event.outcome === "completed" ? 1 : 0;
    groups.set(label, row);
  }

  return [...groups.values()].sort((a, b) => {
    const aRate = a.completed / a.attempted;
    const bRate = b.completed / b.attempted;
    return bRate - aRate || b.attempted - a.attempted;
  });
}

function ProgressChart({ title, rows }: ProgressChartProps) {
  return (
    <section className="progress-chart" aria-label={title}>
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="progress-empty">Registra qualche esito per vedere dove il piano ti sostiene di piu'.</p>
      ) : (
        <div className="progress-chart-rows">
          {rows.map((row) => {
            const percent = Math.round(percentage(row.completed, row.attempted));
            return (
              <div className="progress-row" key={row.label}>
                <div className="progress-row-label">
                  <span>{row.label}</span>
                  <strong>{percent}%</strong>
                </div>
                <div className="progress-track" aria-label={`${row.label}: ${percent}% di riuscita`}>
                  <div className="progress-fill" style={{ width: `${percent}%` }} />
                </div>
                <small>{row.completed} completati su {row.attempted} tentativi</small>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ProgressDashboard({ plan, events, simulatedEvents, onClear }: ProgressDashboardProps) {
  const [mode, setMode] = useState<DashboardMode>("real");

  useEffect(() => {
    setMode(simulatedEvents.length > 0 ? "simulated" : "real");
  }, [simulatedEvents.length]);

  const realEvents: DashboardEvent[] = Object.values(events).map(event => ({ blockId: event.activityId, outcome: event.outcome }));
  const previewEvents: DashboardEvent[] = simulatedEvents.map((event) => ({
    blockId: event.blockId,
    outcome: event.outcome === "skipped" ? "skipped" : "completed",
    recovered: event.outcome === "moved",
  }));
  const isSimulation = mode === "simulated";
  const activeEvents = isSimulation ? previewEvents : realEvents;
  const completed = activeEvents.filter((event) => event.outcome === "completed").length;
  const skipped = activeEvents.filter((event) => event.outcome === "skipped").length;
  const notNeeded = activeEvents.filter((event) => event.outcome === "not-needed").length;
  const recovered = activeEvents.filter((event) => event.recovered).length;
  const attempted = completed + skipped;
  const completionRate = attempted === 0 ? null : Math.round(percentage(completed, attempted));
  const objectiveRows = getRows(plan, activeEvents, (block) => block.title);
  const windowRows = getRows(plan, activeEvents, (block) => getFocusWindow(block.start));
  const hasRealEvents = realEvents.length > 0;
  const celebration = completed === 0
    ? isSimulation
      ? "Avanza nel simulatore per vedere una previsione dell'andamento."
      : "Ogni feedback aiuta il piano a diventare piu' realistico per te."
    : completed === 1
      ? "Hai portato a termine il primo blocco: una vittoria concreta."
      : `Hai completato ${completed} blocchi: stai costruendo un ritmo che funziona.`;

  return (
    <section className="progress-dashboard">
      <div className="progress-dashboard-header">
        <div>
          <p className="eyebrow">{isSimulation ? "Anteprima simulata" : "Andamento reale"}</p>
          <h2>{isSimulation ? "Come potrebbe andare il piano" : "Le tue vittorie della settimana"}</h2>
          <p>{celebration}</p>
        </div>
        <div className="progress-dashboard-actions">
          <div className="progress-mode-switch" aria-label="Origine dei dati">
            <button className={!isSimulation ? "is-active" : ""} onClick={() => setMode("real")} type="button">
              Dati reali
            </button>
            <button
              className={isSimulation ? "is-active" : ""}
              disabled={previewEvents.length === 0}
              onClick={() => setMode("simulated")}
              type="button"
            >
              Preview simulata
            </button>
          </div>
          {hasRealEvents && !isSimulation ? (
            <button className="text-button" type="button" onClick={onClear}>Azzera feedback</button>
          ) : null}
        </div>
      </div>

      {isSimulation ? <p className="simulation-source-note">Stima generata dal profilo del planner: non e' un dato registrato dall'utente.</p> : null}

      <div className="progress-summary" aria-label="Riepilogo dei feedback registrati">
        <article><strong>{completed}</strong><span>Attivita' completate</span></article>
        <article><strong>{completionRate === null ? "-" : `${completionRate}%`}</strong><span>Riuscita sui tentativi</span></article>
        <article><strong>{isSimulation ? recovered : notNeeded}</strong><span>{isSimulation ? "Attivita' recuperate" : "Blocchi non necessari"}</span></article>
      </div>

      <div className="progress-chart-grid">
        <ProgressChart title="Riuscita per obiettivo" rows={objectiveRows} />
        <ProgressChart title="Riuscita per fascia oraria" rows={windowRows} />
      </div>
    </section>
  );
}
