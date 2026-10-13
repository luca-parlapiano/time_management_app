// Anteprima isolata: solo un repository in memoria, nessun bridge Electron.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../src/App";
import { RepositoryDB } from "../src/repository/RepositoryDB";
import { DBProvider } from "../src/providers/DBProvider";
import { LoadingProvider } from "../src/providers/LoadingProvider";
import { addDays, emptyCalendar, occurrences, setOccurrenceOutcome, today } from "../src/domain/calendar";
import { createHabit } from "../src/domain/habits";
import { reconcileHabitCompletion, repeatHabitDraft } from "../src/domain/habitCompletion";
import { outcomeRecord, validateArchive } from "../src/domain/outcomeArchive";
import type { DatabaseSnapshot, DatabaseBridge } from "../src/model/database";
import type { HabitDraft } from "../src/model/habit";
import type { ItemOutcome } from "../src/model/calendar";
import type { PlannerArchive } from "../src/model/outcomeArchive";
import "../src/styles.css";
import "../src/themes.css";

const date = today();
const mode = new URLSearchParams(location.search).get("scenario");
let archive: PlannerArchive = { format: "time-planner-backup", version: 3, calendar: emptyCalendar(), habits: [], history: [] };
const samples: Pick<HabitDraft, "title" | "icon" | "color" | "stepTarget" | "start">[] = [
  { title: "Leggere venti minuti", icon: "study", color: "teal", stepTarget: 6, start: "21:00" },
  { title: "Fare movimento", icon: "sport", color: "orange", stepTarget: 8, start: "18:00" },
  { title: "Scrivere un pensiero", icon: "heart", color: "purple", stepTarget: 5, start: "22:00" },
];
if (mode === "many") samples.push(
  { title: "Una pausa per respirare e ritrovare la concentrazione durante una giornata impegnativa", icon: "rest", color: "blue", stepTarget: 12, start: "12:00" },
  { title: "Studiare una lingua", icon: "study", color: "pink", stepTarget: 4, start: "17:00" },
  { title: "Preparare la giornata", icon: "work", color: "green", stepTarget: 3, start: "08:00" },
);
if (mode === "repeat" || mode === "mixed") {
  const created = createHabit(archive.calendar, [], {title:"Palestra",motivation:"",icon:"sport",color:"purple",stepTarget:3,startsOn:"2026-10-05",weekdays:[0,2,4],start:"18:00",durationMinutes:100}, {habitId:"gym"});
  archive = {...archive,...created};
  for (const event of occurrences(archive.calendar.items,"2026-10-05","2026-12-31")) {
    archive.history.push(outcomeRecord(archive.calendar,event,"completed"));
    archive.calendar = setOccurrenceOutcome(archive.calendar,event.sourceId,event.occurrenceDate,"completed");
  }
  archive = reconcileHabitCompletion(archive);
  archive = {...archive,...createHabit(archive.calendar,archive.habits ?? [],repeatHabitDraft(archive,archive.habits![0],"2026-10-08"),{habitId:"gym-repeat"})};
  if (mode === "mixed") for (const [index,event] of occurrences(archive.calendar.items,"2026-10-12","2026-12-31").entries()) {
    const outcome = index === 1 ? "skipped" : "completed";
    archive.history.push(outcomeRecord(archive.calendar,event,outcome));
    archive.calendar = setOccurrenceOutcome(archive.calendar,event.sourceId,event.occurrenceDate,outcome);
  }
}
if (mode !== "empty" && mode !== "repeat" && mode !== "mixed") samples.forEach((sample, index) => {
  const created = createHabit(archive.calendar, archive.habits ?? [], { ...sample, motivation: "Un piccolo spazio per me, ogni giorno.", startsOn: mode === "new" ? date : addDays(date, -28), weekdays: [0,1,2,3,4,5,6], durationMinutes: 20 }, { habitId: `demo-${index}` });
  archive = { ...archive, ...created };
  if (mode === "new") return;
  const results: (ItemOutcome | undefined)[] = index === 0
    ? ["completed", "completed", "skipped", "completed", "completed", "completed", "completed"]
    : index === 1 ? ["completed", "skipped", "skipped", "skipped", "completed", "skipped", undefined]
      : ["completed", undefined, undefined, "completed", "skipped", undefined, undefined];
  results.forEach((outcome, day) => {
    if (!outcome) return;
    const daysBefore = index === 0 && mode === "future-outcomes" ? 3 : index === 0 && mode === "completed-today" ? 6 : 7;
    const eventDate = addDays(date, day - daysBefore);
    // Simula anche archivi precedenti, che consentivano esiti oltre gli step pianificati.
    const occurrence = occurrences(archive.calendar.items.map(item => ({ ...item, habitPlannedUntil: undefined })), eventDate, eventDate).find(item => item.habitId === `demo-${index}`)!;
    archive.history.push(outcomeRecord(archive.calendar, occurrence, outcome));
    archive.calendar = setOccurrenceOutcome(archive.calendar, occurrence.sourceId, occurrence.occurrenceDate, outcome);
  });
});
if (mode === "rest") archive.calendar = { ...archive.calendar, items: archive.calendar.items.map(item => ({ ...item, exceptions: { ...item.exceptions, [date]: null } })) };
let saved: DatabaseSnapshot = { archive, revision: 0, previous: null };
const memoryBridge: DatabaseBridge = {
  read: async () => structuredClone(saved),
  readPalette: async () => mode === "night" ? "night" : "natural",
  writePalette: async value => value,
  write: async input => {
    if (mode === "failure") throw new Error("Salvataggio non riuscito: errore simulato nei dati di prova.");
    if (input.expectedRevision !== saved.revision) throw new Error("Revisione di prova non aggiornata.");
    validateArchive(input.archive);
    saved = { archive: structuredClone(input.archive), revision: saved.revision + 1, previous: input.replace ? saved.archive : saved.previous };
    return structuredClone(saved);
  },
  reset: async () => { throw new Error("Ripristino disabilitato nell’anteprima di prova."); },
};
const repository = new RepositoryDB(() => memoryBridge);
createRoot(document.getElementById("root")!).render(<StrictMode><LoadingProvider><DBProvider repository={repository}><App /></DBProvider></LoadingProvider></StrictMode>);
