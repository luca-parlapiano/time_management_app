import { isFiniteNumber } from "./numbers.js";
import { positiveModulo } from "./math.js";

/**
 * Restituisce il saluto italiano per un’ora locale (0–23).
 * Dalle 5 alle 11 è mattina, dalle 12 alle 17 pomeriggio; la sera include la notte.
 */
export function greetingForHour(hour: number): "Buongiorno" | "Buon pomeriggio" | "Buonasera" {
  if (hour >= 5 && hour < 12) return "Buongiorno";
  if (hour >= 12 && hour < 18) return "Buon pomeriggio";
  return "Buonasera";
}

/**
 * Formatta un orario con AM/PM e normalizza le ore nel ciclo di 24 ore.
 * Restituisce la stringa originale se ore o minuti non sono numeri finiti.
 * Non valida l’intervallo dei minuti: usare orari già validati.
 * @example formatTimeWithMeridiem("13:05") // "1:05 PM"
 */
export function formatTimeWithMeridiem(time: string) {
  const [rawHours, rawMinutes] = time.split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (!isFiniteNumber(hours) || !isFiniteNumber(minutes)) {
    return time;
  }

  const normalizedDayHours = positiveModulo(hours, 24);
  const period = normalizedDayHours >= 12 ? "PM" : "AM";
  const normalizedHours =
    normalizedDayHours % 12 === 0 ? 12 : normalizedDayHours % 12;
  const normalizedMinutes = minutes.toString().padStart(2, "0");

  return `${normalizedHours}:${normalizedMinutes} ${period}`;
}

/**
 * Formatta inizio e fine con AM/PM, separandoli con un trattino.
 * Non calcola la durata e non verifica l’ordine cronologico degli orari.
 */
export function formatTimeRange(start: string, end: string) {
  return `${formatTimeWithMeridiem(start)} - ${formatTimeWithMeridiem(end)}`;
}

/**
 * Converte un orario HH:MM già validato nei minuti trascorsi dalla mezzanotte.
 * Non effettua validazione né normalizzazione dell’input.
 * @example toMinutes("09:30") // 570
 */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Converte minuti interi finiti in HH:MM, riportandoli nel ciclo di 24 ore.
 * Gestisce valori negativi e durate superiori a un giorno; non valida l’input.
 * @example toTime(-1) // "23:59"
 * @example toTime(1440) // "00:00"
 */
export function toTime(totalMinutes: number): string {
  const normalized = positiveModulo(totalMinutes, 24 * 60);
  const hours = Math.floor(normalized / 60).toString().padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
