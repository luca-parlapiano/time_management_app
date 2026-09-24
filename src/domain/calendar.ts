import { DAY, outcomeLabels, eventIcons, eventColors } from "../constants.js";
export { outcomeLabels, eventIcons, eventColors, kindLabels, statusLabels } from "../constants.js";
import { toMinutes as minute } from "../utils/time.js";
import { addDays, dateNumber, displayDate, validDate, weekStart } from "../utils/dates.js";
import { isIntegerInRange, isPositiveNumber } from "../utils/numbers.js";
import type { CalendarItem, CalendarState, EditAccess, EditTarget, ItemData, ItemOutcome, Occurrence } from "../model/calendar.js";
export type { CalendarGoal,CalendarItem,CalendarProfile,CalendarState,EditAccess,EditTarget,EventColor,EventIcon,ItemData,ItemKind,ItemOutcome,ItemStatus,Occurrence } from "../model/calendar.js";
/** Civil dates and local wall-clock times: never parse YYYY-MM-DD as local/UTC instants. */

export function eventAppearance(item: Pick<ItemData, "icon" | "color" | "kind">) {
  return {
    icon: item.icon ?? (item.kind === "fixed" ? "work" : item.kind === "protected" ? "rest" : "activity"),
    color: item.color ?? (item.kind === "fixed" ? "blue" : item.kind === "protected" ? "green" : "purple"),
  };
}

export const emptyCalendar = (): CalendarState => ({ version: 2, items: [], goals: [], profile: null });
export { addDays, dateNumber, displayDate, today, validDate, weekStart } from "../utils/dates.js";
export function durationMinutes(item: ItemData): number {
  return (dateNumber(item.endDate) - dateNumber(item.date)) / 60_000 + minute(item.end) - minute(item.start);
}
function startMinute(item: ItemData): number { return dateNumber(item.date) / 60_000 + minute(item.start); }
function endMinute(item: ItemData): number { return dateNumber(item.endDate) / 60_000 + minute(item.end); }
export function validateData(data: ItemData): void {
  if (data.coverImage !== undefined && typeof data.coverImage !== "boolean") throw new Error("Immagine non valida.");
  if (data.icon !== undefined && !Object.hasOwn(eventIcons, data.icon)) throw new Error("Icona non valida.");
  if (data.color !== undefined && !Object.hasOwn(eventColors, data.color)) throw new Error("Colore non valido.");
  if (typeof data.title !== "string" || !data.title.trim()) throw new Error("Inserisci un titolo.");
  if (!validDate(data.date) || !validDate(data.endDate)) throw new Error("Inserisci date valide.");
  if (![data.start, data.end].every(t => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t))) throw new Error("Inserisci orari validi.");
  const duration = durationMinutes(data);
  if (!isPositiveNumber(duration) || duration > 1440) throw new Error("La fine deve seguire l’inizio. Durata massima: 24 ore; per il sonno scegli la data del giorno successivo.");
  if (!["fixed", "protected", "flexible"].includes(data.kind)) throw new Error("Tipo non valido.");
  if (data.kind === "flexible" ? !["todo", "completed", "skipped"].includes(data.status ?? "") : data.status !== undefined) throw new Error("Stato non valido per questo tipo.");
  if (typeof data.notes !== "string" || (data.goalId !== undefined && typeof data.goalId !== "string")) throw new Error("Note o obiettivo non validi.");
}
export function isOccurrenceDate(item: CalendarItem, date: string): boolean {
  return date >= item.date && (!item.recurrence?.until || date <= item.recurrence.until) &&
    (dateNumber(date) - dateNumber(item.date)) % (7 * DAY) === 0;
}
export function validateItem(item: CalendarItem): void {
  validateData(item);
  if (item.activityId !== undefined && (typeof item.activityId !== "string" || !item.activityId || !item.recurrence)) throw new Error("Attività ricorrente non valida.");
  if (item.outcomes !== undefined) {
    if (!item.outcomes || typeof item.outcomes !== "object" || Array.isArray(item.outcomes)) throw new Error("Esiti non validi.");
    for (const [date, outcome] of Object.entries(item.outcomes)) {
      if (!validDate(date) || !Object.hasOwn(outcomeLabels, outcome) || (item.recurrence ? !isOccurrenceDate(item, date) : date !== item.date)) throw new Error("Esito non valido.");
    }
  }
  if (item.completedDates !== undefined) {
    if (!item.completedDates || typeof item.completedDates !== "object" || Array.isArray(item.completedDates)) throw new Error("Completamenti non validi.");
    for (const [date, completed] of Object.entries(item.completedDates)) {
      if (!validDate(date) || typeof completed !== "boolean" || (item.recurrence ? !isOccurrenceDate(item, date) : date !== item.date)) throw new Error("Data di completamento non valida.");
    }
  }
  if (typeof item.id !== "string" || !item.id || !item.exceptions || typeof item.exceptions !== "object" || Array.isArray(item.exceptions)) throw new Error("Elemento non valido.");
  if (item.recurrence !== undefined) {
    if (!item.recurrence || typeof item.recurrence !== "object" || Array.isArray(item.recurrence)) throw new Error("Ripetizione non valida.");
    if (item.recurrence.until !== undefined && (!validDate(item.recurrence.until) || item.recurrence.until < item.date)) throw new Error("La fine della serie deve seguire la prima data.");
  } else if (Object.keys(item.exceptions).length) throw new Error("Eccezioni senza serie.");
  for (const [date, data] of Object.entries(item.exceptions)) {
    if (!validDate(date) || !isOccurrenceDate(item, date)) throw new Error("La serie deve includere le date originali delle eccezioni già salvate. Modifica prima le singole eccezioni o conserva la fine attuale della serie.");
    if (data !== null) {
      validateData(data);
      if (item.kind !== "flexible" && data.kind === "flexible") throw new Error("Un’eccezione a un vincolo deve restare un vincolo.");
    }
  }
}
export function validateCalendar(state: CalendarState): void {
  if (!state || state.version !== 2 || !Array.isArray(state.items) || !Array.isArray(state.goals)) throw new Error("Archivio calendario non riconosciuto.");
  const ids = new Set<string>();
  for (const goal of state.goals) {
    if (!goal || typeof goal.id !== "string" || !goal.id || ids.has(goal.id) || typeof goal.name !== "string" || !goal.name.trim()) throw new Error("Obiettivi non validi.");
    ids.add(goal.id);
  }
  const itemIds = new Set<string>();
  for (const item of state.items) {
    if (!item) throw new Error("Elemento non valido.");
    validateItem(item);
    if (itemIds.has(item.id)) throw new Error("Identificativo duplicato.");
    itemIds.add(item.id);
    for (const data of [item, ...Object.values(item.exceptions)]) {
      if (data?.goalId !== undefined && !ids.has(data.goalId)) throw new Error("Collegamento a obiettivo mancante.");
    }
  }
  if (state.profile !== null && (!state.profile || typeof state.profile.name !== "string" || typeof state.profile.notes !== "string")) throw new Error("Profilo non valido.");
}
function dataOf(item: ItemData): ItemData {
  return { ...(item.coverImage !== undefined ? { coverImage: item.coverImage } : {}), ...(item.icon !== undefined ? { icon: item.icon } : {}), ...(item.color !== undefined ? { color: item.color } : {}), title: item.title, date: item.date, endDate: item.endDate,
    start: item.start, end: item.end, kind: item.kind, status: item.status, notes: item.notes, goalId: item.goalId };
}
function atDate(item: CalendarItem, date: string): ItemData {
  return { ...dataOf(item), date, endDate: addDays(date, (dateNumber(item.endDate) - dateNumber(item.date)) / DAY) };
}
export function occurrences(items: CalendarItem[], from: string, through: string): Occurrence[] {
  const result: Occurrence[] = [];
  function include(item: CalendarItem, original: string, data: ItemData, exception: boolean) {
    if (data.date <= through && (data.endDate > from || (data.endDate === from && data.end > "00:00"))) {
      const outcome = item.outcomes?.[original] ?? (item.completedDates?.[original] === true ? "completed" : item.completedDates?.[original] === false ? undefined : data.status === "completed" || data.status === "skipped" ? data.status : undefined);
      result.push({ ...data, id: item.recurrence ? `${item.id}@${original}` : item.id,
        sourceId: item.id, occurrenceDate: original, completed: outcome === "completed", outcome, recurring: Boolean(item.recurrence), exception });
    }
  }
  for (const item of items) {
    if (!item.recurrence) { include(item, item.date, item, false); continue; }
    const first = addDays(from, -1);
    const offset = Math.max(0, Math.ceil((dateNumber(first) - dateNumber(item.date)) / (7 * DAY)));
    for (let date = addDays(item.date, offset * 7); date <= through && (!item.recurrence.until || date <= item.recurrence.until); date = addDays(date, 7)) {
      if (!Object.hasOwn(item.exceptions, date)) include(item, date, atDate(item, date), false);
    }
    // Moved exceptions must also be found when their original date is outside this view.
    for (const [date, data] of Object.entries(item.exceptions)) if (data) include(item, date, data, true);
  }
  return result.sort((a, b) => startMinute(a) - startMinute(b) || a.id.localeCompare(b.id));
}

/** Exact for weekly series and <=24h events: between all boundaries/exception dates,
 * the pattern repeats every seven days. Inspect one full week on both sides of each
 * boundary, including moved exceptions, rather than silently imposing a time horizon. */
export function findConflict(items: CalendarItem[], changedId: string): [Occurrence, Occurrence] | undefined {
  const dates = new Set<string>();
  for (const item of items) {
    dates.add(item.date);
    if (item.recurrence?.until) dates.add(item.recurrence.until);
    for (const [date, data] of Object.entries(item.exceptions)) {
      dates.add(date);
      if (data) dates.add(data.date);
    }
  }
  for (const date of dates) {
    const visible = occurrences(items, addDays(date, -8), addDays(date, 8));
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length && startMinute(visible[j]) < endMinute(visible[i]); j++) {
        if (visible[i].sourceId === changedId || visible[j].sourceId === changedId) return [visible[i], visible[j]];
      }
    }
  }
}

function guard(item: CalendarItem | undefined, access: EditAccess) {
  if (item && item.kind !== "flexible" && (access.actor !== "user" || !access.unlocked)) throw new Error("Vincolo bloccato: solo l’utente può sbloccarlo esplicitamente.");
}
export function putItem(state: CalendarState, proposed: CalendarItem, access: EditAccess, target?: EditTarget): CalendarState {
  const existing = target ? state.items.find(item => item.id === target.sourceId) : undefined;
  if (target && !existing) throw new Error("Elemento non trovato.");
  guard(existing, access);
  if (access.actor !== "user" && proposed.kind !== "flexible") throw new Error("Il motore e l’AI possono inserire solo attività flessibili.");
  validateData(proposed);
  let replacement: CalendarItem = { ...dataOf(proposed), id: proposed.id, recurrence: proposed.recurrence, exceptions: proposed.exceptions, title: proposed.title.trim() };
  if (existing) {
    if (existing.recurrence && target?.scope === "occurrence") {
      if (!isOccurrenceDate(existing, target.occurrenceDate)) throw new Error("Occorrenza non valida.");
      const { id: _id, recurrence: _recurrence, exceptions: _exceptions, ...data } = replacement;
      replacement = { ...existing, exceptions: { ...existing.exceptions, [target.occurrenceDate]: data } };
    } else {
      if (existing.recurrence && (replacement.date !== existing.date || !replacement.recurrence)) throw new Error("La data di inizio e la frequenza della serie sono stabili. Modifica una singola occorrenza per spostarla.");
      replacement = { ...replacement, id: existing.id, activityId: existing.activityId, outcomes: existing.outcomes, completedDates: existing.completedDates, exceptions: existing.exceptions };
      if (!existing.recurrence && existing.outcomes && replacement.date !== existing.date) {
        replacement.outcomes = existing.outcomes[existing.date] === undefined ? {} : { [replacement.date]: existing.outcomes[existing.date] };
      }
      if (!existing.recurrence && existing.completedDates && replacement.date !== existing.date) {
        replacement.completedDates = existing.completedDates[existing.date] === undefined ? {} : { [replacement.date]: existing.completedDates[existing.date] };
      }
    }
    if (existing.recurrence && (target?.applyAppearanceToSeries ||
      (target?.scope === "series" && (proposed.icon !== existing.icon || proposed.color !== existing.color || proposed.coverImage !== existing.coverImage)))) {
      const appearance = { ...eventAppearance(proposed), ...(proposed.coverImage !== undefined ? { coverImage: proposed.coverImage } : {}) };
      replacement = { ...replacement, ...appearance, exceptions: Object.fromEntries(
        Object.entries(replacement.exceptions).map(([date, data]) => [date, data === null ? null : { ...data, ...appearance }]),
      ) };
    }
  } else if (state.items.some(item => item.id === replacement.id)) throw new Error("Identificativo già presente.");
  let next = { ...state, items: existing ? state.items.map(item => item.id === existing.id ? replacement : item) : [...state.items, replacement] };
  if (existing?.recurrence) {
    const selected = new Set([existing.id, ...(target?.linkedSourceIds ?? [])]);
    for (const id of selected) {
      const member = state.items.find(item => item.id === id);
      if (!member?.recurrence) throw new Error("Puoi collegare solo appuntamenti ricorrenti.");
      guard(member, access);
    }
    const groups = new Set(state.items.filter(item => selected.has(item.id) && item.activityId).map(item => item.activityId));
    const members = next.items.filter(item => selected.has(item.id) || item.activityId && groups.has(item.activityId));
    if (existing.activityId || members.length > 1) {
      const activityId = existing.activityId ?? existing.id;
      const shared = { title: proposed.title.trim(), ...eventAppearance(proposed), ...(proposed.coverImage !== undefined ? { coverImage: proposed.coverImage } : {}), notes: proposed.notes, goalId: proposed.goalId };
      const memberIds = new Set(members.map(item => item.id));
      next = { ...next, items: next.items.map(item => {
        if (!memberIds.has(item.id)) return item;
        guard(item, access);
        return { ...item, ...shared, activityId, exceptions: Object.fromEntries(Object.entries(item.exceptions).map(([date, data]) => [date, data === null ? null : { ...data, ...shared }])) };
      }) };
    }
  }
  validateCalendar(next);
  const conflict = findConflict(next.items, replacement.id);
  if (conflict) throw new Error(`Conflitto: “${conflict[0].title}” e “${conflict[1].title}” il ${displayDate(conflict[1].date, { year: "numeric" })}. Scegli un altro intervallo; nessun vincolo è stato modificato.`);
  return next;
}
export function deleteItem(state: CalendarState, target: EditTarget, access: EditAccess): CalendarState {
  const item = state.items.find(entry => entry.id === target.sourceId);
  if (!item) throw new Error("Elemento non trovato.");
  guard(item, access);
  if (item.recurrence && target.scope === "occurrence") {
    if (!isOccurrenceDate(item, target.occurrenceDate)) throw new Error("Occorrenza non valida.");
    return { ...state, items: state.items.map(entry => entry.id === item.id ? { ...entry, exceptions: { ...entry.exceptions, [target.occurrenceDate]: null } } : entry) };
  }
  return { ...state, items: state.items.filter(entry => entry.id !== item.id) };
}
export function clearCalendar(state: CalendarState): CalendarState { return { ...state, items: [] }; }

/** Create weekly appointments with one shared activity identity, atomically. */
export function putWeeklyActivity(state: CalendarState, proposed: CalendarItem, weekdays: number[], access: EditAccess, target?: EditTarget): CalendarState {
  if (!proposed.recurrence || !weekdays.length || weekdays.some(day => !isIntegerInRange(day, 0, 6)) || new Set(weekdays).size !== weekdays.length) throw new Error("Scegli almeno un giorno della settimana.");
  const existing = target ? state.items.find(item => item.id === target.sourceId) : undefined;
  if (target && (!existing || existing.recurrence)) throw new Error("Scegli un’attività senza ripetizione da convertire.");
  guard(existing, access);
  const span = (dateNumber(proposed.endDate) - dateNumber(proposed.date)) / DAY;
  const dates = weekdays.map(day => {
    let date = addDays(weekStart(proposed.date), day);
    if (date < proposed.date) date = addDays(date, 7);
    return { day, date };
  }).sort((a, b) => a.date.localeCompare(b.date));
  // When converting, reuse matching appointments instead of creating overlapping copies.
  const matches = dates.map(({ date }) => existing ? state.items.filter(item =>
    item.id !== existing.id && item.title.trim().toLocaleLowerCase("it-IT") === proposed.title.trim().toLocaleLowerCase("it-IT") &&
    item.kind === proposed.kind && item.start === proposed.start && item.end === proposed.end && durationMinutes(item) === durationMinutes(proposed) &&
    item.date >= date && (!proposed.recurrence?.until || item.date <= proposed.recurrence.until) &&
    (dateNumber(item.date) - dateNumber(date)) % (7 * DAY) === 0 &&
    // A series can be reused only if its end boundary is identical.
    (!item.recurrence || item.recurrence.until === proposed.recurrence?.until)
  ) : []);
  const reused = matches.flat();
  for (const item of reused) guard(item, access);
  const replacedIds = new Set([...(existing ? [existing.id] : []), ...reused.map(item => item.id)]);
  let next = { ...state, items: state.items.filter(item => !replacedIds.has(item.id)) };
  const ids = new Set<string>();
  for (const [index, { day, date }] of dates.entries()) {
    if (proposed.recurrence.until && date > proposed.recurrence.until) throw new Error("La fine della ripetizione deve includere tutti i giorni scelti.");
    const id = existing && index === 0 ? existing.id : `${proposed.id}-${day}`;
    const exceptions: CalendarItem["exceptions"] = {};
    const outcomes: NonNullable<CalendarItem["outcomes"]> = {};
    const completedDates: NonNullable<CalendarItem["completedDates"]> = {};
    for (const previous of matches[index]) {
      if (previous.recurrence) Object.assign(exceptions, previous.exceptions);
      else exceptions[previous.date] = dataOf(previous);
      Object.assign(outcomes, previous.outcomes);
      Object.assign(completedDates, previous.completedDates);
    }
    if (existing && index === 0) {
      if (existing.outcomes?.[existing.date]) outcomes[date] = existing.outcomes[existing.date];
      if (existing.completedDates?.[existing.date] !== undefined) completedDates[date] = existing.completedDates[existing.date];
      else if (existing.status === "completed" || existing.status === "skipped") outcomes[date] = existing.status;
    }
    next = putItem(next, { ...proposed, id, date, endDate: addDays(date, span), status: proposed.kind === "flexible" ? "todo" : undefined, exceptions }, access);
    next = { ...next, items: next.items.map(item => item.id === id ? { ...item, outcomes, completedDates } : item) };
    ids.add(id);
  }
  const reusedGroups = new Set(reused.map(item => item.activityId).filter(Boolean));
  next = { ...next, items: next.items.map(item => ids.has(item.id) || item.activityId && reusedGroups.has(item.activityId)
    ? { ...item, activityId: proposed.id } : item) };
  validateCalendar(next);
  return next;
}

/** Completion records belong to the original appointment date, even after a move. */
export function setOccurrenceCompleted(state: CalendarState, sourceId: string, date: string, completed: boolean): CalendarState {
  const item = state.items.find(item => item.id === sourceId);
  if (!item || !validDate(date) || (item.recurrence ? !isOccurrenceDate(item, date) || item.exceptions[date] === null : item.date !== date)) throw new Error("Appuntamento non trovato.");
  const next = { ...state, items: state.items.map(entry => {
    if (entry.id !== sourceId) return entry;
    if (entry.kind === "flexible" && !entry.recurrence) return { ...entry, status: completed ? "completed" as const : "todo" as const };
    return { ...entry, completedDates: { ...entry.completedDates, [date]: completed } };
  }) };
  validateCalendar(next);
  return next;
}

export function setOccurrenceOutcome(state: CalendarState, sourceId: string, date: string, outcome: ItemOutcome): CalendarState {
  const item = state.items.find(entry => entry.id === sourceId);
  if (!Object.hasOwn(outcomeLabels, outcome)) throw new Error("Esito non valido.");
  if (!item || !validDate(date) || (item.recurrence ? !isOccurrenceDate(item, date) || item.exceptions[date] === null : item.date !== date)) throw new Error("Appuntamento non trovato.");
  const next = { ...state, items: state.items.map(entry => entry.id === sourceId ? { ...entry, outcomes: { ...entry.outcomes, [date]: outcome } } : entry) };
  validateCalendar(next);
  return next;
}
