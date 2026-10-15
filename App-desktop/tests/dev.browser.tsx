import { StrictMode, act } from "react";
import { createRoot } from "react-dom/client";
import { DBProvider } from "../src/providers/DBProvider";
import { LoadingProvider } from "../src/providers/LoadingProvider";
import { useDB } from "../src/hooks/useDB";
import { createDevRepository } from "../src/repository/DevRepository";
import { occurrences } from "../src/domain/calendar";
import { habitDraft } from "../src/domain/habits";
import type { DBContextValue } from "../src/model/database";
import type { HabitDraft } from "../src/model/habit";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let parent: DBContextValue;
let lab: DBContextValue;
function ParentProbe() { parent = useDB(); return null; }
function LabProbe() { lab = useDB(); return null; }
const personal = createDevRepository(), sandbox = createDevRepository();
const root = createRoot(document.getElementById("test-root")!);
const results: string[] = [];
function check(value: unknown, message: string) { if (!value) throw new Error(message); results.push(`PASS ${message}`); }
const draft: HabitDraft = { title: "Test", motivation: "", icon: "study", color: "teal", stepTarget: 6, startsOn: "2026-10-05", weekdays: [0, 1, 2, 3, 4, 5, 6], start: "10:00", durationMinutes: 20 };
try {
  await act(async () => { root.render(<StrictMode><LoadingProvider><DBProvider repository={personal}><ParentProbe /><LoadingProvider><DBProvider repository={sandbox}><LabProbe /></DBProvider></LoadingProvider></DBProvider></LoadingProvider></StrictMode>); });
  await act(async () => { await parent.saveHabit({ ...draft, title: "Dati esterni" }); });
  const original = JSON.stringify(parent!.archive);
  await act(async () => { await lab.saveHabit(draft); });
  const habitId = lab!.habits[0].id;
  const event = (date: string) => occurrences(lab.state.items, date, date)[0];
  const stats = (reference = "2026-10-07") => lab.getActivityYearStatistics(lab.getStatisticsActivities()[0].id, 2026, reference);
  await act(async () => { await lab.recordOutcome(event("2026-10-05"), "completed"); });
  await act(async () => { await lab.recordOutcome(event("2026-10-05"), "completed"); });
  check(stats().completed === 1 && lab!.archive.history.length === 2, "Ripetere Fatto non duplica il completamento, ma conserva l’audit");
  await act(async () => { await lab.recordOutcome(event("2026-10-06"), "skipped"); });
  check(lab!.getDailyStatistics("2026-10-06").completionPercent === 0 && stats().days.find(day => day.date === "2026-10-06")?.percent === 0, "Non fatto pesa zero in entrambe le viste");
  const futureEvent = event("2026-10-08");
  await act(async () => { await lab.recordOutcome(futureEvent, "completed"); });
  check(lab!.getHabitProgress(habitId).completed === 2 && stats().completed === 1 && stats().futureCompleted === 1 && stats("2026-10-08").completed === 2, "Oggi simulato sposta gli esiti futuri nel totale senza scritture");
  await act(async () => { await lab.updateHabit(habitId, { ...draft, stepTarget: 3 }); });
  check(lab!.getHabitCompletionDate(habitId) === "2026-10-08" && !event("2026-10-09"), "Il traguardo chiude la serie e rimuove la pianificazione successiva");
  await act(async () => { await lab.recordOutcome(futureEvent, "skipped"); });
  check(lab!.getHabitCompletionDate(habitId) === "2026-10-08" && !event("2026-10-09"), "La correzione mantiene la serie conclusa e aggiorna il risultato");
  await act(async () => { await lab.updateHabit(habitId, { ...habitDraft(lab.state, lab.habits[0]), weekdays: [1, 2, 3, 4, 5, 6] }); });
  check(stats().completed === 1, "Cambiare giorni conserva il risultato della fonte rimossa");
  const beforeFailure = JSON.stringify(lab!.archive);
  let rejected = false;
  await act(async () => { try { await lab.updateHabit(habitId, { ...draft, durationMinutes: -1 }); } catch { rejected = true; } });
  check(rejected && JSON.stringify(lab!.archive) === beforeFailure, "Una modifica non valida non pubblica uno snapshot parziale");
  check(JSON.stringify(parent!.archive) === original, "Tutte le azioni nel Provider annidato lasciano invariato il Provider esterno");
  await act(async () => { await lab.importBackup(structuredClone(parent.archive), { mode: "local" }); });
  await act(async () => { await lab.recordOutcome(event("2026-10-05"), "completed"); });
  check(JSON.stringify(parent!.archive) === original && lab!.getHabitProgress(lab!.habits[0].id).completed === 1, "La copia è modificabile senza alterare i dati originali");
  await act(async () => { await lab.resetAll(); });
  check(!lab!.habits.length && !lab!.archive.history.length && JSON.stringify(parent!.archive) === original, "Azzera cancella soltanto il laboratorio");
  await act(async () => { await lab.saveHabit({ ...draft, startsOn: "2028-02-28", stepTarget: 3 }); });
  const futurePlan = occurrences(lab!.state.items, "2028-02-28", "2028-03-05");
  check(futurePlan.length === 3 && futurePlan[1].date === "2028-02-29", "Il piano futuro include correttamente il giorno bisestile");
  await act(async () => {
    const result = await lab.recordOutcomes([...futurePlan].reverse(), "completed");
    check(result.saved === 3 && result.skipped === 0 && result.lastDate === "2028-03-01", "Il blocco segue le date e si ferma al traguardo sullo snapshot aggiornato");
  });
  const futureId = lab!.habits[0].id;
  check(lab!.getHabitCompletionDate(futureId) === "2028-03-01" && lab!.getActivityYearStatistics(futurePlan[0].sourceId, 2028, "2028-03-01").completed === 3, "Tutti gli esiti futuri sono verificabili immediatamente con la data simulata");
  await act(async () => {
    const result = await lab.recordOutcomes(futurePlan, "completed");
    check(result.saved === 0 && lab.archive.history.length === 3, "Ripetere il blocco non duplica lo storico");
  });
  await act(async () => { await lab.recordOutcomes(futurePlan, "skipped"); });
  check(lab!.getHabitCompletionDate(futureId) === "2028-03-01" && lab!.getHabitProgress(futureId).completed === 0 && lab!.getDailyStatistics("2028-03-01").skipped === 1 && lab!.getDailyStatistics("2028-03-05").total === 0, "Correggere tutti gli esiti conserva la chiusura senza generare altre date");
  check(JSON.stringify(parent!.archive) === original, "Anche la compilazione futura in blocco resta isolata");
  await act(async () => { await lab.resetAll(); await lab.saveHabit(draft); });
  const failurePlan = occurrences(lab!.state.items, "2026-10-05", "2026-10-08");
  const save = sandbox.save.bind(sandbox);
  let remainingWrites = 1;
  sandbox.save = async input => { if (remainingWrites-- === 0) throw new Error("Errore di scrittura simulato"); return save(input); };
  let batchError = "";
  await act(async () => { try { await lab.recordOutcomes(failurePlan, "completed"); } catch (cause) { batchError = String(cause); } });
  sandbox.save = save;
  check(batchError.includes("dopo 1 esiti salvati") && lab!.archive.history.length === 1 && !lab!.saving, "Un errore interrompe il blocco e dichiara i risultati già confermati senza registrare gli altri");
  results.push("TUTTI I TEST DEV SUPERATI");
} catch (cause) { results.push(`FAIL ${cause instanceof Error ? cause.stack : String(cause)}`); }
finally { await act(async () => { root.unmount(); }); document.getElementById("results")!.textContent = results.join("\n"); globalThis.IS_REACT_ACT_ENVIRONMENT = false; }
