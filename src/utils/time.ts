import { isIntegerInRange } from "./numbers.js";
import { positiveModulo } from "./math.js";

/**
 * Normalizza un orario digitato in HH:MM: accetta ore sole (9), HMM/HHMM
 * (930, 1930) e H:MM/HH:MM. Ignora spazi esterni e restituisce undefined
 * per input vuoti, incompleti o fuori da 00:00–23:59, senza arrotondamenti.
 */
export function normalizeTimeInput(value: string): string | undefined {
  const text = value.trim();
  let hours: number;
  let minutes: number;
  if (/^\d{1,2}$/.test(text)) {
    hours = Number(text);
    minutes = 0;
  } else if (/^\d{3,4}$/.test(text)) {
    hours = Number(text.slice(0, -2));
    minutes = Number(text.slice(-2));
  } else if (/^\d{1,2}:\d{2}$/.test(text)) {
    [hours, minutes] = text.split(":").map(Number);
  } else return undefined;
  if (!isIntegerInRange(hours, 0, 23) || !isIntegerInRange(minutes, 0, 59)) return undefined;
  return toTime(hours * 60 + minutes);
}

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
