/**
 * Logica dei dadi.
 *
 * `parseInt(diceType.substring(1))` era ripetuto in 8 punti diversi per
 * calcolare se un lancio fosse critico. Qui c'è una volta sola.
 */

export const DICE_TYPES = ['d2', 'd3', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const;

export type DiceType = (typeof DICE_TYPES)[number];

export const DEFAULT_DICE: DiceType = 'd20';

/** Numero di facce di un dado. Restituisce 0 se la stringa non è valida. */
export function parseSides(diceType: string | undefined | null): number {
  if (!diceType) return 0;
  const sides = Number.parseInt(diceType.slice(1), 10);
  return Number.isFinite(sides) && sides > 0 ? sides : 0;
}

/** Tira un dado. Usa getRandomValues quando disponibile. */
export function rollDie(diceType: string): number {
  const sides = parseSides(diceType);
  if (sides <= 0) return 0;

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    // Rifiuta i valori nella coda non divisibile, per non favorire i numeri bassi.
    const limit = Math.floor(0xffffffff / sides) * sides;
    const buf = new Uint32Array(1);
    let value: number;
    do {
      crypto.getRandomValues(buf);
      value = buf[0];
    } while (value >= limit);
    return (value % sides) + 1;
  }

  return Math.floor(Math.random() * sides) + 1;
}

/** Successo critico: risultato massimo del dado. */
export function isCritical(result: number, diceType: string): boolean {
  const sides = parseSides(diceType);
  return sides > 0 && result === sides;
}

/** Fallimento critico: 1 naturale. */
export function isFumble(result: number, diceType: string): boolean {
  return parseSides(diceType) > 0 && result === 1;
}

export function isDiceType(value: unknown): value is DiceType {
  return typeof value === 'string' && (DICE_TYPES as readonly string[]).includes(value);
}
