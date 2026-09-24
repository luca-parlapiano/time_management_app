import { DAY } from "../constants.js";
export { DAY } from "../constants.js";
import { isFiniteNumber } from "./numbers.js";

/**
 * Converte una data civile YYYY-MM-DD nel timestamp della mezzanotte UTC.
 * Usare validDate per validare l’input: Date.parse può normalizzare date inesistenti
 * o restituire NaN per stringhe non interpretabili.
 */
export function dateNumber(date: string): number { return Date.parse(`${date}T00:00:00Z`); }
/**
 * Sposta una data civile valida di count giorni e restituisce YYYY-MM-DD.
 * count deve essere un intero, anche negativo; il calcolo UTC evita gli effetti dell’ora legale.
 * Il risultato deve rimanere nell’intervallo rappresentabile dalle date JavaScript.
 */
export function addDays(date: string, count: number): string {
  return new Date(dateNumber(date) + count * DAY).toISOString().slice(0, 10);
}
/**
 * Restituisce la data corrente nel fuso orario locale, in formato YYYY-MM-DD.
 */
export function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
/**
 * Restituisce il lunedì della settimana che contiene la data civile valida ricevuta.
 * Il risultato usa il formato YYYY-MM-DD e può appartenere al mese o all’anno precedente.
 */
export function weekStart(date: string): string {
  return addDays(date, -((new Date(dateNumber(date)).getUTCDay() + 6) % 7));
}
/**
 * Formatta una data civile valida in italiano, mostrando giorno e mese per impostazione predefinita.
 * options personalizza la visualizzazione; il fuso resta UTC per preservare il giorno richiesto.
 */
export function displayDate(date: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", ...options, timeZone: "UTC" }).format(new Date(dateNumber(date)));
}
/**
 * Verifica formato YYYY-MM-DD ed esistenza della data, inclusi gli anni bisestili.
 * Accetta solo date dal 1900-01-01 al 9998-12-31, estremi inclusi, e restringe il tipo a string.
 */
export function validDate(date: unknown): date is string {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    date >= "1900-01-01" && date <= "9998-12-31" && isFiniteNumber(dateNumber(date)) &&
    new Date(dateNumber(date)).toISOString().slice(0, 10) === date;
}
