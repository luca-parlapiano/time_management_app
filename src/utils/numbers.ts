/**
 * Verifica che il valore sia un numero finito, escludendo NaN e infinito.
 * Non converte stringhe, booleani o null in numeri; restringe il tipo a number.
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Verifica che il valore sia un numero finito maggiore di zero.
 * Accetta anche decimali positivi, senza conversioni implicite.
 */
export function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

/**
 * Verifica che il valore sia un intero finito compreso tra min e max inclusi.
 * I limiti omessi non impongono restrizioni; non converte stringhe numeriche.
 */
export function isIntegerInRange(value: unknown, min = -Infinity, max = Infinity): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= min && value <= max;
}

/**
 * Verifica che il valore sia un intero tra zero e Number.MAX_SAFE_INTEGER.
 * Utile per contatori e revisioni del database rappresentabili senza perdita di precisione.
 */
export function isNonNegativeSafeInteger(value: unknown): value is number {
  return isIntegerInRange(value, 0, Number.MAX_SAFE_INTEGER);
}
