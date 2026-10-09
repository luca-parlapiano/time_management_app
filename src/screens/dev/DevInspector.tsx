import type { CSSProperties } from "react";
import { useDB } from "../../hooks/useDB";
import { latestOutcomes } from "../../domain/outcomeArchive";
import { eventColors, outcomeLabels } from "../../constants";
import { HabitJourney } from "../habits/HabitJourney";
import { DailyDoughnut } from "../statistics/DailyDoughnut";
import { ActivityHeatmap } from "../statistics/ActivityHeatmap";

interface DevInspectorProps { activityId?: string; habitId?: string; selectedDate: string; referenceDate: string }

/** Legge soltanto lo snapshot confermato dal Provider, senza mantenere contatori paralleli. */
export function DevInspector({ activityId, habitId, selectedDate, referenceDate }: DevInspectorProps) {
  const db = useDB();
  const statistics = activityId ? db.getActivityYearStatistics(activityId, Number(selectedDate.slice(0, 4)), referenceDate) : undefined;
  const day = statistics?.days.find(entry => entry.date === selectedDate);
  const daily = db.getDailyStatistics(selectedDate);
  const progress = habitId ? db.getHabitProgress(habitId) : undefined;
  const closedOn = habitId ? db.getHabitCompletionDate(habitId) : undefined;
  const latest = latestOutcomes(db.archive.history);
  return <section className="dev-card dev-inspector" style={{ "--event-color": eventColors[statistics?.activity.color ?? "teal"].value } as CSSProperties}><h3>2. Osserva la reazione</h3>
    <div role="status" aria-label="Risultati del laboratorio" aria-live="polite">
      <dl className="dev-metrics">
        {progress && <><div><dt>Completamenti del percorso · tutte le date</dt><dd>{progress.completed}</dd></div><div><dt>Stato della serie</dt><dd>{closedOn ? `Chiusa il ${closedOn}` : "In corso"}</dd></div></>}
        <div><dt>Completamenti {statistics?.year} fino al {referenceDate}</dt><dd>{statistics?.completed ?? 0}</dd></div>
        <div><dt>Completamenti su date future dello stesso anno</dt><dd>{statistics?.futureCompleted ?? 0}</dd></div>
        <div><dt>Non fatti · anno fino alla data di riferimento</dt><dd>{statistics?.skipped ?? 0}</dd></div>
        <div><dt>Esiti unici / scritture storico · intero laboratorio</dt><dd>{latest.length} / {db.archive.history.length}</dd></div>
      </dl>
    </div>
    {progress && <HabitJourney progress={progress} compact />}
    <h4>Giorno {selectedDate}</h4>
    <p>Per attività: {day?.percent === null || day?.percent === undefined ? "nessuna percentuale registrata" : `${Math.round(day.percent)}%`} · {day?.completed ?? 0} fatti, {day?.skipped ?? 0} non fatti, {day?.pending ?? 0} senza esito.{day?.state === "future" && " Giorno futuro rispetto alla data di riferimento."}</p>
    <p className="dev-note">Panoramica di tutte le attività del giorno: fatti / pianificati. Per attività: fatti / pianificati. Le serie con lo stesso nome possono essere raggruppate nella vista per attività; il percorso sopra appartiene alla singola abitudine.</p>
    <DailyDoughnut statistics={daily} />
    {statistics && <details><summary>Calendario annuale dell’attività</summary><ActivityHeatmap statistics={statistics} /></details>}
    <details><summary>Registro esiti · ultima correzione per occorrenza</summary>
      <p>Le identità e le date originali consentono di riconoscere la stessa occorrenza anche dopo uno spostamento. Include l’audit delle attività eliminate, escluso dalle statistiche.</p>
      <div className="dev-table-wrap"><table><thead><tr><th>Attività</th><th>Data esito</th><th>Esito</th><th>Identità originale</th></tr></thead><tbody>{latest.map(record => <tr key={record.id}><td>{record.title}</td><td>{record.eventDate}</td><td>{outcomeLabels[record.outcome]}</td><td><code>{record.sourceId}@{record.occurrenceDate}</code></td></tr>)}</tbody></table></div>
    </details>
    <details><summary>Snapshot confermato · JSON in sola lettura</summary><pre className="dev-json">{JSON.stringify(db.archive, null, 2)}</pre></details>
  </section>;
}
