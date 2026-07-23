/**
 * Logica dei dadi.
 *
 * `parseInt(diceType.substring(1))` era ripetuto in 8 punti diversi per
 * calcolare se un lancio fosse critico. Qui c'è una volta sola.
 */

import type { RollMode } from '../types';

export const DICE_TYPES = ['d2', 'd3', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const;

export type DiceType = (typeof DICE_TYPES)[number];

export const DEFAULT_DICE: DiceType = 'd20';

/** Massimo numero di dadi in un tiro multiplo (NdX). */
export const MAX_DICE_COUNT = 12;

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

/**
 * Esito di un lancio Dado+.
 *
 * `result` è sempre il numero finale mostrato; `detail` lo racconta; `mode`
 * distingue i casi. Su `sum` il critico va soppresso (una somma NdX non fa
 * critico), sui tiri a faccia singola resta valido sul `result`.
 */
export interface DiceRoll {
  result: number;
  detail?: string;
  mode?: RollMode;
}

/** Tiro singolo: nessun `detail` né `mode`, come un lancio normale. */
export function rollSingle(diceType: string): DiceRoll {
  return { result: rollDie(diceType) };
}

/** Tira due dadi e tiene il più alto (vantaggio) o il più basso (svantaggio). */
function rollKeepOne(diceType: string, keep: 'high' | 'low'): DiceRoll {
  const a = rollDie(diceType);
  const b = rollDie(diceType);
  const result = keep === 'high' ? Math.max(a, b) : Math.min(a, b);
  const mode: RollMode = keep === 'high' ? 'advantage' : 'disadvantage';
  const kept = keep === 'high' ? Math.max(a, b) : Math.min(a, b);
  const dropped = keep === 'high' ? Math.min(a, b) : Math.max(a, b);
  return { result, mode, detail: `${kept} / ${dropped}` };
}

export const rollAdvantage = (diceType: string): DiceRoll => rollKeepOne(diceType, 'high');
export const rollDisadvantage = (diceType: string): DiceRoll => rollKeepOne(diceType, 'low');

/**
 * Somma di più dadi dello stesso tipo (es. 3d6). Con un dado solo è un tiro
 * singolo — nessun `mode`, così il critico resta possibile.
 */
export function rollMultiple(diceType: string, count: number): DiceRoll {
  const n = Math.max(1, Math.min(Math.floor(count) || 1, MAX_DICE_COUNT));
  if (n === 1) return rollSingle(diceType);

  const dice = Array.from({ length: n }, () => rollDie(diceType));
  const result = dice.reduce((sum, value) => sum + value, 0);
  return { result, mode: 'sum', detail: dice.join(' + ') };
}

/**
 * Un lancio è "criticabile" quando rappresenta una faccia singola.
 * Le somme (`sum`) no: 18 su 3d6 non è un critico.
 */
export function scoresCrit(mode: RollMode | undefined): boolean {
  return mode !== 'sum';
}

/**
 * Ricava i singoli dadi di un lancio dal suo `detail`, per poterli disegnare.
 *
 * - somma: tutti i dadi tirati (`kept` assente);
 * - vantaggio/svantaggio: i due dadi, con `kept` che indica quello tenuto;
 * - tiro singolo: un solo dado, il risultato stesso.
 */
export function rollDice(roll: {
  result: number;
  detail?: string;
  mode?: RollMode;
}): { values: number[]; kept?: number } {
  if (roll.mode === 'sum' && roll.detail) {
    const values = roll.detail.split(' + ').map(Number).filter(Number.isFinite);
    return values.length > 0 ? { values } : { values: [roll.result] };
  }

  if ((roll.mode === 'advantage' || roll.mode === 'disadvantage') && roll.detail) {
    const values = roll.detail.split(' / ').map(Number).filter(Number.isFinite);
    if (values.length === 2) return { values, kept: roll.result };
  }

  return { values: [roll.result] };
}
