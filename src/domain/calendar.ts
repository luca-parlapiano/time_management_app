/**
 * Regole del calendario: validazione, ricorrenze, conflitti e modifiche agli elementi.
 * Le operazioni restituiscono un nuovo stato senza salvarlo: il Provider coordina
 * la persistenza e aggiorna la UI soltanto dopo la conferma del repository.
 * Date e orari rappresentano giorni civili e minuti di orologio, non istanti locali.
 */
import { DAY, outcomeLabels, eventIcons, eventColors } from "../constants.js";
export { outcomeLabels, eventIcons, eventColors, kindLabels } from "../constants.js";
import { toMinutes as minute } from "../utils/time.js";
import { addDays, dateNumber, displayDate, validDate, weekStart } from "../utils/dates.js";
import { isIntegerInRange, isPositiveNumber } from "../utils/numbers.js";
import type { CalendarItem, CalendarState, EditAccess, EditTarget, ItemData, ItemOutcome, Occurrence } from "../model/calendar.js";
export type { CalendarGoal,CalendarItem,CalendarProfile,CalendarState,EditAccess,EditTarget,EventColor,EventIcon,ItemData,ItemKind,ItemOutcome,Occurrence } from "../model/calendar.js";

/**
 * Restituisce icona e colore dell’elemento, usando i valori predefiniti del tipo
 * quando mancano. Permette di visualizzare anche gli elementi degli archivi precedenti.
 */
export function eventAppearance(item: Pick<ItemData, "icon" | "color" | "kind">) {
  return {
    icon: item.icon ?? (item.kind === "fixed" ? "work" : item.kind === "protected" ? "rest" : "activity"),
    color: item.color ?? (item.kind === "fixed" ? "blue" : item.kind === "protected" ? "green" : "purple"),
  };
}

/**
 * Indica se un elemento appartiene alla Home operativa. Mostra solo attività
 * flessibili ricorrenti; vincoli e attività singole restano nel Calendario.
 */
type ProgressActivity = Pick<CalendarItem, "kind" | "habitId" | "routine"> | Pick<Occurrence, "kind" | "habitId" | "routine">;

/** Restituisce true soltanto per abitudini e routine ricorrenti di cui registrare i progressi. */
export function isProgressActivity(item: ProgressActivity): boolean {
  return item.kind === "flexible" && (Boolean(item.habitId) || item.routine === true);
}

/** Indica se un'occorrenza deve comparire nella dashboard operativa di oggi. */
export function appearsOnTodayScreen(item: Pick<Occurrence, "kind" | "habitId" | "routine">): boolean {
  return isProgressActivity(item);
}

/**
 * Restituisce il piano operativo della data civile richiesta dallo snapshot confermato.
 * Esclude le serie di abitudini chiuse, anche il giorno del traguardo, conservando
 * le occorrenze con esito delle serie ancora attive e delle routine.
 * Non modifica lo storico consultabile nel calendario.
 */
export function todayOccurrences(items: CalendarItem[], date: string): Occurrence[] {
  const active = items.filter(item => !item.habitId || !item.habitClosedOn);
  return occurrences(active, date, date).filter(item => item.date === date && appearsOnTodayScreen(item));
}

/**
 * Crea un calendario v2 vuoto con array nuovi a ogni chiamata.
 * Non legge archivi e non impone la compilazione del profilo.
 */
export const emptyCalendar = (): CalendarState => ({ version: 2, items: [], goals: [], profile: null });
export { addDays, dateNumber, displayDate, today, validDate, weekStart } from "../utils/dates.js";
/**
 * Calcola la durata tra date e orari già validati, includendo l’eventuale mezzanotte.
 * Restituisce minuti di orologio civile: il cambio di ora legale non altera il calcolo.
 */
export function durationMinutes(item: ItemData): number {
  return (dateNumber(item.endDate) - dateNumber(item.date)) / 60_000 + minute(item.end) - minute(item.start);
}
/**
 * Converte l’inizio già validato in una coordinata numerica per ordinare gli intervalli.
 * La coordinata serve ai confronti tra date civili, non misura un istante nel fuso locale.
 */
function startMinute(item: ItemData): number { return dateNumber(item.date) / 60_000 + minute(item.start); }
/**
 * Converte la fine già validata nella stessa coordinata usata da startMinute.
 * Il confine finale è esclusivo: due eventi adiacenti non si sovrappongono.
 */
function endMinute(item: ItemData): number { return dateNumber(item.endDate) / 60_000 + minute(item.end); }
/**
 * Valida i campi di un appuntamento o di un’eccezione; non controlla ID o ricorrenze.
 * Solleva un errore presentabile all’utente per dati non validi, durata non positiva
 * o superiore a 24 ore.
 */
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
  if (typeof data.notes !== "string" || (data.goalId !== undefined && typeof data.goalId !== "string")) throw new Error("Note o obiettivo non validi.");
}
/**
 * Verifica se una data civile appartiene alla cadenza settimanale originaria dell’elemento.
 * Richiede date valide; include l’eventuale ultimo giorno della serie. Non consulta
 * eccezioni o spostamenti: va usata per la data originale, non per quella visualizzata.
 */
export function isOccurrenceDate(item: CalendarItem, date: string): boolean {
  return date >= item.date && (!item.recurrence?.until || date <= item.recurrence.until) &&
    (dateNumber(date) - dateNumber(item.date)) % (7 * DAY) === 0;
}
/**
 * Valida un elemento con ID, esiti, ricorrenza ed eccezioni, sollevando errori descrittivi.
 * Le chiavi di esiti ed eccezioni devono appartenere alle date originarie della serie;
 * un’eccezione spostata può invece contenere una data di destinazione diversa.
 */
export function validateItem(item: CalendarItem): void {
  validateData(item);
  if (item.weeklyHabitId !== undefined && (typeof item.weeklyHabitId !== "string" || !item.weeklyHabitId || item.habitId || item.routine || item.outcomes || item.kind !== "flexible")) throw new Error("Collegamento alle ore non valido.");
  if (item.timeOriginalDate !== undefined && (!item.weeklyHabitId || !validDate(item.timeOriginalDate))) throw new Error("Data originale delle ore non valida.");
  if (item.timeHabitUntil !== undefined && (!item.weeklyHabitId || !validDate(item.timeHabitUntil))) throw new Error("Fine dell’abitudine a ore non valida.");
  if (item.activityId !== undefined && (typeof item.activityId !== "string" || !item.activityId || !item.recurrence)) throw new Error("Attività ricorrente non valida.");
  if (item.routine !== undefined && (item.routine !== true || item.kind !== "flexible" || !item.recurrence || item.habitId)) throw new Error("Routine non valida.");
  if (item.habitId !== undefined && (typeof item.habitId !== "string" || !item.habitId || !item.recurrence)) {
    throw new Error("Collegamento all’abitudine non valido.");
  }
  if (item.habitClosedOn !== undefined && (!item.habitId || !validDate(item.habitClosedOn))) throw new Error("Chiusura dell’abitudine non valida.");
  if (item.habitPlannedUntil !== undefined && (!item.habitId || !validDate(item.habitPlannedUntil))) throw new Error("Fine pianificata dell’abitudine non valida.");
  if (item.outcomes !== undefined) {
    if (!item.outcomes || typeof item.outcomes !== "object" || Array.isArray(item.outcomes)) throw new Error("Esiti non validi.");
    for (const [date, outcome] of Object.entries(item.outcomes)) {
      if (!validDate(date) || !Object.hasOwn(outcomeLabels, outcome) || (item.recurrence ? !isOccurrenceDate(item, date) : date !== item.date)) throw new Error("Esito non valido.");
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
/**
 * Valida struttura v2, elementi, profilo, unicità degli ID e collegamenti agli obiettivi.
 * Solleva un errore se l’archivio è incoerente. Non verifica le sovrapposizioni:
 * quel controllo viene applicato separatamente durante inserimenti e modifiche.
 */
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
/**
 * Copia soltanto i campi persistibili dell’appuntamento.
 * Esclude ID, ricorrenza e metadati della vista, evitando di salvarli in un’eccezione.
 */
function dataOf(item: ItemData): ItemData {
  return { ...(item.coverImage !== undefined ? { coverImage: item.coverImage } : {}), ...(item.icon !== undefined ? { icon: item.icon } : {}), ...(item.color !== undefined ? { color: item.color } : {}), title: item.title, date: item.date, endDate: item.endDate,
    start: item.start, end: item.end, kind: item.kind, notes: item.notes, goalId: item.goalId };
}
/**
 * Costruisce i dati di una ricorrenza sulla data richiesta, senza applicare eccezioni.
 * Mantiene lo scarto tra giorno iniziale e finale, anche per eventi notturni.
 */
function atDate(item: CalendarItem, date: string): ItemData {
  return { ...dataOf(item), date, endDate: addDays(date, (dateNumber(item.endDate) - dateNumber(item.date)) / DAY) };
}
/**
 * Espande gli elementi nel periodo civile inclusivo from–through e li ordina per inizio.
 * Richiede elementi e date validi. Include continuazioni notturne ed eccezioni spostate
 * nel periodo; una fine a mezzanotte non occupa il giorno successivo.
 * occurrenceDate conserva la data originale anche quando date indica lo spostamento.
 */
export function occurrences(items: CalendarItem[], from: string, through: string): Occurrence[] {
  const result: Occurrence[] = [];
  function include(item: CalendarItem, original: string, data: ItemData, exception: boolean) {
    if (item.timeHabitUntil && data.date > item.timeHabitUntil) return;
    if (item.habitPlannedUntil && original > item.habitPlannedUntil) return;
    if (item.habitClosedOn && data.date > item.habitClosedOn) return;
    if (data.date <= through && (data.endDate > from || (data.endDate === from && data.end > "00:00"))) {
      const outcome = item.outcomes?.[original];
      result.push({ ...data, id: item.recurrence ? `${item.id}@${original}` : item.id,
        sourceId: item.id, occurrenceDate: original, completed: outcome === "completed", outcome, recurring: Boolean(item.recurrence), exception,
        ...(item.habitId ? { habitId: item.habitId } : {}), ...(item.weeklyHabitId ? { weeklyHabitId: item.weeklyHabitId } : {}), ...(item.routine ? { routine: true as const } : {}) });
    }
  }
  for (const item of items) {
    if (!item.recurrence) { include(item, item.timeOriginalDate ?? item.date, item, false); continue; }
    // Con durata massima di 24 ore, basta il giorno precedente per includere gli eventi notturni.
    const first = addDays(from, -1);
    const offset = Math.max(0, Math.ceil((dateNumber(first) - dateNumber(item.date)) / (7 * DAY)));
    for (let date = addDays(item.date, offset * 7); date <= through && (!item.habitPlannedUntil || date <= item.habitPlannedUntil) && (!item.habitClosedOn || date <= item.habitClosedOn) && (!item.recurrence.until || date <= item.recurrence.until); date = addDays(date, 7)) {
      if (!Object.hasOwn(item.exceptions, date)) include(item, date, atDate(item, date), false);
    }
    // Cerca anche le eccezioni la cui data originale è fuori vista ma la destinazione è nel periodo.
    for (const [date, data] of Object.entries(item.exceptions)) if (data) include(item, date, data, true);
  }
  return result.sort((a, b) => startMinute(a) - startMinute(b) || a.id.localeCompare(b.id));
}

/**
 * Cerca una sovrapposizione che coinvolge changedId tra elementi già validati.
 * Restituisce la prima coppia trovata, oppure undefined; non cerca conflitti estranei
 * all’elemento modificato e non considera conflittuali intervalli adiacenti.
 * Per serie settimanali ed eventi di massimo 24 ore, tra inizio/fine serie ed eccezioni
 * lo schema si ripete ogni sette giorni: basta controllare finestre attorno a tali
 * confini, senza imporre una scadenza artificiale alle serie infinite.
 */
export function findConflict(items: CalendarItem[], changedId: string): [Occurrence, Occurrence] | undefined {
  const dates = new Set<string>();
  for (const item of items) {
    dates.add(item.date);
    if (item.recurrence?.until) dates.add(item.recurrence.until);
    if (item.habitClosedOn) dates.add(item.habitClosedOn);
    if (item.habitPlannedUntil) dates.add(item.habitPlannedUntil);
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

/** Errore di sovrapposizione con i due appuntamenti coinvolti, utile per mostrare una scelta informata nella UI. */
export class CalendarConflictError extends Error {
  constructor(readonly entries: [Occurrence, Occurrence], readonly changedId: string) {
    const occupied = entries.find(entry => entry.sourceId !== changedId) ?? entries[0];
    super(`Conflitto: “${occupied.title}” occupa il ${displayDate(occupied.date, { year: "numeric" })} dalle ${occupied.start} alle ${occupied.end}. Scegli un altro intervallo; nessun appuntamento è stato modificato.`);
    this.name = "CalendarConflictError";
  }
}

/**
 * Rifiuta modifiche a un vincolo esistente se manca lo sblocco esplicito dell’utente.
 * Motore e AI non possono superare la protezione; elementi assenti o flessibili passano.
 */
function guard(item: CalendarItem | undefined, access: EditAccess) {
  if (item && item.kind !== "flexible" && (access.actor !== "user" || !access.unlocked)) throw new Error("Vincolo bloccato: solo l’utente può sbloccarlo esplicitamente.");
}
/**
 * Inserisce o modifica un elemento e restituisce il calendario risultante senza mutare state.
 * target identifica elemento e ambito della modifica; access stabilisce chi può agire.
 * Mantiene identità, esiti ed eccezioni esistenti e propaga i campi condivisi dei gruppi.
 * Solleva un errore per dati, permessi o conflitti non validi, senza applicare modifiche.
 */
export function putItem(state: CalendarState, proposed: CalendarItem, access: EditAccess, target?: EditTarget): CalendarState {
  const existing = target ? state.items.find(item => item.id === target.sourceId) : undefined;
  if (target && !existing) throw new Error("Elemento non trovato.");
  guard(existing, access);
  if (access.actor !== "user" && proposed.kind !== "flexible") throw new Error("Il motore e l’AI possono inserire solo attività flessibili.");
  validateData(proposed);
  let replacement: CalendarItem = { ...dataOf(proposed), id: proposed.id, recurrence: proposed.recurrence, exceptions: proposed.exceptions, title: proposed.title.trim(),
    ...(proposed.weeklyHabitId ? { weeklyHabitId: proposed.weeklyHabitId, timeHabitUntil: proposed.timeHabitUntil, ...(!proposed.recurrence ? { timeOriginalDate: proposed.timeOriginalDate ?? proposed.date } : {}) } : {}),
    ...(proposed.habitId ? { habitId: proposed.habitId, habitPlannedUntil: proposed.habitPlannedUntil } : {}), ...(proposed.routine ? { routine: true } : {}) };
  if (existing) {
    if (existing.recurrence && target?.scope === "occurrence") {
      if (!isOccurrenceDate(existing, target.occurrenceDate)) throw new Error("Occorrenza non valida.");
      // La chiave resta la data originale: spostare l’evento non ne cambia l’identità.
      replacement = { ...existing, exceptions: { ...existing.exceptions, [target.occurrenceDate]: dataOf(replacement) } };
    } else {
      if (existing.recurrence && (replacement.date !== existing.date || !replacement.recurrence)) throw new Error("La data di inizio e la frequenza della serie sono stabili. Modifica una singola occorrenza per spostarla.");
      replacement = { ...replacement, id: existing.id, activityId: existing.activityId, habitId: existing.habitId, weeklyHabitId: existing.weeklyHabitId, timeHabitUntil: existing.timeHabitUntil, timeOriginalDate: existing.timeOriginalDate, habitPlannedUntil: existing.habitPlannedUntil, habitClosedOn: existing.habitClosedOn, outcomes: existing.outcomes, exceptions: existing.exceptions };
      // Negli eventi singoli la data stessa è la chiave dell’esito e segue lo spostamento.
      if (!existing.recurrence && existing.outcomes && replacement.date !== existing.date) {
        replacement.outcomes = existing.outcomes[existing.date] === undefined ? {} : { [replacement.date]: existing.outcomes[existing.date] };
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
      if (member.weeklyHabitId !== existing.weeklyHabitId) throw new Error("Non puoi collegare serie di abitudini diverse.");
    }
    // Collegare una serie include anche il suo gruppo: gli orari restano indipendenti.
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
  // Restituisce il candidato soltanto dopo aver controllato struttura e conflitti.
  validateCalendar(next);
  const conflict = findConflict(next.items, replacement.id);
  if (conflict) throw new CalendarConflictError(conflict, replacement.id);
  return next;
}
/**
 * Restituisce un calendario senza l’elemento indicato o con l’occorrenza marcata eliminata.
 * Usa target per scegliere l’ambito e access per proteggere i vincoli. Una cancellazione
 * singola salva un’eccezione null: la serie non rigenera l’appuntamento.
 * Non gestisce lo storico degli esiti, che appartiene all’archivio esterno al calendario.
 */
export function deleteItem(state: CalendarState, target: EditTarget, access: EditAccess): CalendarState {
  const item = state.items.find(entry => entry.id === target.sourceId);
  if (!item) throw new Error("Elemento non trovato.");
  guard(item, access);
  if (item.habitId && target.scope === "series") throw new Error("Questa serie appartiene a un’abitudine. Modificala dalla sezione Abitudini; qui puoi eliminare una singola occorrenza.");
  if (item.recurrence && target.scope === "occurrence") {
    if (!isOccurrenceDate(item, target.occurrenceDate)) throw new Error("Occorrenza non valida.");
    return { ...state, items: state.items.map(entry => entry.id === item.id ? { ...entry, exceptions: { ...entry.exceptions, [target.occurrenceDate]: null } } : entry) };
  }
  return { ...state, items: state.items.filter(entry => entry.id !== item.id) };
}
/**
 * Restituisce uno stato senza elementi, mantenendo profilo e obiettivi.
 * Conferma e sblocco collettivo sono gestiti dalla UI; lo storico separato non viene toccato.
 */
export function clearCalendar(state: CalendarState): CalendarState { return { ...state, items: [] }; }

/**
 * Crea una serie per ogni giorno richiesto, con un’identità di attività condivisa.
 * weekdays usa 0 = lunedì e 6 = domenica, senza duplicati; target permette di convertire
 * un elemento non ricorrente. Riutilizza appuntamenti compatibili preservandone gli esiti.
 * Restituisce il nuovo calendario solo se tutti gli inserimenti sono validi; un errore
 * lascia state invariato. La persistenza atomica del risultato spetta al Provider.
 */
export function putWeeklyActivity(state: CalendarState, proposed: CalendarItem, weekdays: number[], access: EditAccess, target?: EditTarget): CalendarState {
  if (!proposed.recurrence || !weekdays.length || weekdays.some(day => !isIntegerInRange(day, 0, 6)) || new Set(weekdays).size !== weekdays.length) throw new Error("Scegli almeno un giorno della settimana.");
  const existing = target ? state.items.find(item => item.id === target.sourceId) : undefined;
  if (target && (!existing || existing.recurrence)) throw new Error("Scegli un’attività senza ripetizione da convertire.");
  guard(existing, access);
  if (existing?.weeklyHabitId) throw new Error("Per ripetere una sessione a ore, crea una nuova pianificazione: quella originale conserva il suo diario.");
  const span = (dateNumber(proposed.endDate) - dateNumber(proposed.date)) / DAY;
  const dates = weekdays.map(day => {
    let date = addDays(weekStart(proposed.date), day);
    if (date < proposed.date) date = addDays(date, 7);
    return { day, date };
  }).sort((a, b) => a.date.localeCompare(b.date));
  // Nella conversione riusa appuntamenti compatibili, evitando di creare copie sovrapposte.
  const matches = dates.map(({ date }) => existing ? state.items.filter(item =>
    item.id !== existing.id && item.title.trim().toLocaleLowerCase("it-IT") === proposed.title.trim().toLocaleLowerCase("it-IT") &&
    item.kind === proposed.kind && item.start === proposed.start && item.end === proposed.end && durationMinutes(item) === durationMinutes(proposed) &&
    Boolean(item.routine) === Boolean(proposed.routine) && item.weeklyHabitId === proposed.weeklyHabitId &&
    item.date >= date && (!proposed.recurrence?.until || item.date <= proposed.recurrence.until) &&
    (dateNumber(item.date) - dateNumber(date)) % (7 * DAY) === 0 &&
    // Una serie è riutilizzabile solo se ha la stessa scadenza, anche quando è illimitata.
    (!item.recurrence || item.recurrence.until === proposed.recurrence?.until)
  ) : []);
  const reused = matches.flat();
  for (const item of reused) guard(item, access);
  const replacedIds = new Set([...(existing ? [existing.id] : []), ...reused.map(item => item.id)]);
  // Il calendario di lavoro è locale: un errore successivo non modifica quello del chiamante.
  let next = { ...state, items: state.items.filter(item => !replacedIds.has(item.id)) };
  const ids = new Set<string>();
  for (const [index, { day, date }] of dates.entries()) {
    if (proposed.recurrence.until && date > proposed.recurrence.until) throw new Error("La fine della ripetizione deve includere tutti i giorni scelti.");
    const id = existing && index === 0 ? existing.id : `${proposed.id}-${day}`;
    const exceptions: CalendarItem["exceptions"] = {};
    const outcomes: NonNullable<CalendarItem["outcomes"]> = {};
    for (const previous of matches[index]) {
      if (previous.recurrence) Object.assign(exceptions, previous.exceptions);
      else exceptions[previous.date] = dataOf(previous);
      Object.assign(outcomes, previous.outcomes);
    }
    if (existing && index === 0) {
      if (existing.outcomes?.[existing.date]) outcomes[date] = existing.outcomes[existing.date];
    }
    next = putItem(next, { ...proposed, id, date, endDate: addDays(date, span), exceptions }, access);
    next = { ...next, items: next.items.map(item => item.id === id ? { ...item, ...(proposed.weeklyHabitId ? {} : { outcomes }) } : item) };
    ids.add(id);
  }
  const reusedGroups = new Set(reused.map(item => item.activityId).filter(Boolean));
  next = { ...next, items: next.items.map(item => ids.has(item.id) || item.activityId && reusedGroups.has(item.activityId)
    ? { ...item, activityId: proposed.id } : item) };
  validateCalendar(next);
  return next;
}

/**
 * Registra l’esito corrente per sourceId e data originale dell’appuntamento.
 * Restituisce un nuovo calendario o solleva un errore per esito/data non validi o
 * occorrenza eliminata. Non modifica gli orari e non richiede lo sblocco del vincolo.
 * Il Provider aggiunge separatamente la registrazione allo storico nella stessa operazione.
 */
export function setOccurrenceOutcome(state: CalendarState, sourceId: string, date: string, outcome: ItemOutcome): CalendarState {
  const item = state.items.find(entry => entry.id === sourceId);
  if (!Object.hasOwn(outcomeLabels, outcome)) throw new Error("Esito non valido.");
  if (!item || !validDate(date) || (item.recurrence ? !isOccurrenceDate(item, date) || item.exceptions[date] === null : item.date !== date)) throw new Error("Appuntamento non trovato.");
  const next = { ...state, items: state.items.map(entry => entry.id === sourceId ? { ...entry, outcomes: { ...entry.outcomes, [date]: outcome } } : entry) };
  validateCalendar(next);
  return next;
}
