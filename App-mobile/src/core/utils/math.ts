// Generato da scripts/sync-core.mjs: modificare il sorgente in App-desktop.
import { isFiniteNumber } from './numbers';

/**
 * Limita value all’intervallo inclusivo [min, max].
 * Il chiamante deve fornire numeri validi e limiti ordinati (min <= max).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calcola la percentuale di part rispetto a total, senza arrotondarla.
 * Restituisce zero se un parametro non è finito o total è minore o uguale a zero.
 * Non limita il risultato a [0, 100]: conserva contributi negativi e valori oltre il totale.
 */
export function percentage(part: number, total: number): number {
  if (!isFiniteNumber(part) || !isFiniteNumber(total) || total <= 0) return 0;
  return part / total * 100;
}

/**
 * Riporta value nell’intervallo [0, modulus), anche quando value è negativo.
 * Richiede un valore finito e un modulo finito strettamente positivo.
 * @example positiveModulo(-1, 1440) // 1439
 */
export function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}
