// Generato da scripts/sync-core.mjs: modificare il sorgente in App-desktop.
import { habitCompletionDate } from "./habitCompletion";
import { HABIT_DASHBOARD_DAYS, HABIT_DASHBOARD_OCCASIONS, HABIT_DASHBOARD_ROWS } from "../constants";
import type { HabitDashboard, HabitDashboardRow, HabitOutcomeIndex } from "../model/habit";
import type { PlannerArchive } from "../model/outcomeArchive";
import { addDays, validDate } from "../utils/dates";
import { habitJourneyProgress, habitTimeline } from "./habitTimeline";

/**
 * Deriva il riepilogo dallo snapshot confermato, già preparato da DBRepository,
 * dal relativo indice degli esiti e da data/orario civili HH:MM.
 * Non ricostruisce le chiusure del calendario né deduplica nuovamente lo storico.
 * Mostra al massimo sette occasioni disponibili negli ultimi 28 giorni per riga;
 * esclude il futuro senza esito e conserva distinti esiti non fatti e assenze.
 * Le correzioni prevalgono, senza ricostruire piani storici non più disponibili.
 * Rifiuta date/orari non validi e non modifica né salva l'archivio ricevuto.
 */
export function habitDashboard(archive: PlannerArchive, index: HabitOutcomeIndex, date: string, time: string): HabitDashboard {
  if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Data o orario del percorso non valido.");
  const habits = archive.habits ?? [];
  const activeHabits = habits.filter(habit => !habitCompletionDate(index, habit));
  const from = addDays(date, 1 - HABIT_DASHBOARD_DAYS);
  const sources = new Map(archive.calendar.items.map(item => [item.id, item]));
  const rows: HabitDashboardRow[] = activeHabits.map(habit => {
    const journey = habitJourneyProgress(index, habit, date);
    const entries = habitTimeline(archive.calendar, index, habit, from, date)
      .map(entry => {
        const record = index.byOccurrence.get(JSON.stringify([entry.sourceId, entry.occurrenceDate]));
        return record ? { ...entry, outcome: record.outcome } : entry;
      })
      .filter(entry => {
        // Una registrazione storica non deve riapparire nella vecchia data se
        // l'occasione corrente è stata spostata fuori dalla finestra visibile.
        const exception = sources.get(entry.sourceId)?.exceptions[entry.occurrenceDate];
        if (exception && exception.date !== entry.date) return false;
        return entry.date < date || !!entry.outcome || !!entry.start && entry.start < time;
      })
      .slice(-HABIT_DASHBOARD_OCCASIONS);
    const counts = { completed: 0, skipped: 0, pending: 0 };
    for (const entry of entries) counts[entry.outcome ?? "pending"]++;
    return { habit, journey, remaining: journey.target - journey.currentStep, entries, counts };
  });
  // A parità di distanza resta l'ordine delle abitudini attive.
  // Senza esiti registrati il messaggio resta introduttivo.
  const featured = rows.some(row => row.journey.currentStep > 0)
    ? rows.reduce<HabitDashboardRow | null>((best, row) => !best || row.remaining < best.remaining ? row : best, null)
    : null;
  return {
    rows: rows.slice(0, HABIT_DASHBOARD_ROWS), totalHabits: rows.length, featured,
    milestonesReached: habits.length - activeHabits.length,
  };
}
