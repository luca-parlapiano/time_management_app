/** Civil dates and local wall-clock times: never parse YYYY-MM-DD as local/UTC instants. */
export type ItemKind = "fixed" | "protected" | "flexible";
export type ItemStatus = "todo" | "completed" | "skipped";
export interface ItemData {
  title: string;
  date: string;
  endDate: string;
  start: string;
  end: string;
  kind: ItemKind;
  status?: ItemStatus;
  notes: string;
  goalId?: string;
}
export interface CalendarItem extends ItemData {
  id: string;
  // Weekly on the weekday of date, inclusive until; no end means indefinite.
  recurrence?: { until?: string };
  // Keys always identify the ORIGINAL occurrence date, including moved occurrences.
  exceptions: Record<string, ItemData | null>;
}
export interface Occurrence extends ItemData {
  id: string;
  sourceId: string;
  occurrenceDate: string;
  recurring: boolean;
  exception: boolean;
}
export interface CalendarGoal { id: string; name: string }
export interface CalendarProfile { name: string; notes: string }
export interface CalendarState {
  version: 2;
  items: CalendarItem[];
  goals: CalendarGoal[];
  profile: CalendarProfile | null;
}
export const kindLabels: Record<ItemKind, string> = {
  fixed: "Impegno fisso", protected: "Tempo protetto", flexible: "Attività flessibile",
};
export const statusLabels: Record<ItemStatus, string> = {
  todo: "Da fare", completed: "Completato", skipped: "Saltato",
};
export const emptyCalendar = (): CalendarState => ({ version: 2, items: [], goals: [], profile: null });
const DAY = 86_400_000;
export function dateNumber(date: string): number { return Date.parse(`${date}T00:00:00Z`); }
export function addDays(date: string, count: number): string {
  return new Date(dateNumber(date) + count * DAY).toISOString().slice(0, 10);
}
export function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function weekStart(date: string): string {
  return addDays(date, -((new Date(dateNumber(date)).getUTCDay() + 6) % 7));
}
export function displayDate(date: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", ...options, timeZone: "UTC" }).format(new Date(dateNumber(date)));
}
export function validDate(date: unknown): date is string {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    date >= "1900-01-01" && date <= "9998-12-31" && Number.isFinite(dateNumber(date)) &&
    new Date(dateNumber(date)).toISOString().slice(0, 10) === date;
}
function minute(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export function durationMinutes(item: ItemData): number {
  return (dateNumber(item.endDate) - dateNumber(item.date)) / 60_000 + minute(item.end) - minute(item.start);
}
function startMinute(item: ItemData): number { return dateNumber(item.date) / 60_000 + minute(item.start); }
function endMinute(item: ItemData): number { return dateNumber(item.endDate) / 60_000 + minute(item.end); }
export function validateData(data: ItemData): void {
  if (typeof data.title !== "string" || !data.title.trim()) throw new Error("Inserisci un titolo.");
  if (!validDate(data.date) || !validDate(data.endDate)) throw new Error("Inserisci date valide.");
  if (![data.start, data.end].every(t => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t))) throw new Error("Inserisci orari validi.");
  if (!Number.isFinite(durationMinutes(data)) || durationMinutes(data) <= 0 || durationMinutes(data) > 1440) throw new Error("La fine deve seguire l’inizio. Durata massima: 24 ore; per il sonno scegli la data del giorno successivo.");
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
  if (typeof item.id !== "string" || !item.id || !item.exceptions || typeof item.exceptions !== "object" || Array.isArray(item.exceptions)) throw new Error("Elemento non valido.");
  if (item.recurrence !== undefined) {
    if (!item.recurrence || typeof item.recurrence !== "object" || Array.isArray(item.recurrence) || item.kind === "flexible") throw new Error("La ricorrenza è disponibile per impegni fissi e tempo protetto.");
    if (item.recurrence.until !== undefined && (!validDate(item.recurrence.until) || item.recurrence.until < item.date)) throw new Error("La fine della serie deve seguire la prima data.");
  } else if (Object.keys(item.exceptions).length) throw new Error("Eccezioni senza serie.");
  for (const [date, data] of Object.entries(item.exceptions)) {
    if (!validDate(date) || !isOccurrenceDate(item, date)) throw new Error("La serie deve includere le date originali delle eccezioni già salvate. Modifica prima le singole eccezioni o conserva la fine attuale della serie.");
    if (data !== null) {
      validateData(data);
      if (data.kind === "flexible") throw new Error("Un’eccezione a un vincolo deve restare un vincolo.");
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
  return { title: item.title, date: item.date, endDate: item.endDate,
    start: item.start, end: item.end, kind: item.kind, status: item.status, notes: item.notes, goalId: item.goalId };
}
function atDate(item: CalendarItem, date: string): ItemData {
  return { ...dataOf(item), date, endDate: addDays(date, (dateNumber(item.endDate) - dateNumber(item.date)) / DAY) };
}
export function occurrences(items: CalendarItem[], from: string, through: string): Occurrence[] {
  const result: Occurrence[] = [];
  function include(item: CalendarItem, original: string, data: ItemData, exception: boolean) {
    if (data.date <= through && (data.endDate > from || (data.endDate === from && data.end > "00:00"))) {
      result.push({ ...data, id: item.recurrence ? `${item.id}@${original}` : item.id,
        sourceId: item.id, occurrenceDate: original, recurring: Boolean(item.recurrence), exception });
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
export interface EditTarget { sourceId: string; occurrenceDate: string; scope: "occurrence" | "series" }
export interface EditAccess { actor: "user" | "engine" | "ai"; unlocked?: boolean }
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
      replacement = { ...replacement, id: existing.id, exceptions: existing.exceptions };
    }
  } else if (state.items.some(item => item.id === replacement.id)) throw new Error("Identificativo già presente.");
  const next = { ...state, items: existing ? state.items.map(item => item.id === existing.id ? replacement : item) : [...state.items, replacement] };
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
