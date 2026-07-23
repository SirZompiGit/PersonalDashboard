/**
 * Visualizzazione di un lancio, con i dadi che lo compongono.
 *
 * Un tiro singolo è un dado grande col numero. Un tiro Dado+ mostra i dadi
 * davvero tirati:
 *  - **somma (NdX)**: i dadi affiancati più il totale;
 *  - **vantaggio/svantaggio**: i due dadi, con quello tenuto in evidenza e
 *    l'altro spento.
 *
 * Un solo componente, così il roller e la condivisione mostrano la stessa cosa.
 */

import type { RollResult } from '../types';
import { isCritical, isFumble, rollDice, scoresCrit } from '../lib/dice';
import { CRITICAL_COLOR, DiceShape, FUMBLE_COLOR, type DiceReveal } from './DiceShape';

interface DiceResultProps {
  roll: RollResult;
  accent: string;
  reveal?: DiceReveal;
  /** Classe del dado singolo (grande). */
  bigClass: string;
  /** Classe di ciascun dado in un tiro multiplo. */
  smallClass: string;
}

export function DiceResult({
  roll,
  accent,
  reveal = 'full',
  bigClass,
  smallClass,
}: DiceResultProps) {
  const canCrit = scoresCrit(roll.mode);
  const outcome = !canCrit
    ? null
    : isCritical(roll.result, roll.diceType)
      ? 'critical'
      : isFumble(roll.result, roll.diceType)
        ? 'fumble'
        : null;

  // Nascosto: un solo dado con il punto interrogativo, i singoli non contano.
  if (reveal === 'hidden') {
    return (
      <DiceShape
        key={roll.timestamp}
        diceType={roll.diceType}
        value={null}
        state="result"
        accent={accent}
        reveal="hidden"
        className={bigClass}
      />
    );
  }

  const { values, kept } = rollDice(roll);

  // Tiro singolo: il dado grande di sempre.
  if (values.length === 1) {
    return (
      <DiceShape
        key={roll.timestamp}
        diceType={roll.diceType}
        value={values[0]}
        state="result"
        accent={accent}
        reveal={reveal}
        outcome={outcome}
        className={bigClass}
      />
    );
  }

  const totalColor =
    outcome === 'critical' ? CRITICAL_COLOR : outcome === 'fumble' ? FUMBLE_COLOR : undefined;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {values.map((value, index) => {
          // Nel vantaggio/svantaggio uno dei due è quello tenuto: pieno; l'altro
          // resta visibile ma spento. `kept` è il valore, e il primo che lo
          // eguaglia è quello scelto (l'altro, a parità, è comunque uguale).
          const isKept = kept === undefined || (value === kept && values.indexOf(kept) === index);
          // Se il master ha nascosto il lancio, tutti i dadi restano spenti.
          const dieReveal: DiceReveal =
            reveal === 'dimmed' || (kept !== undefined && !isKept) ? 'dimmed' : 'full';
          return (
            <DiceShape
              key={`${roll.timestamp}-${index}`}
              diceType={roll.diceType}
              value={value}
              state="result"
              accent={accent}
              reveal={dieReveal}
              className={smallClass}
            />
          );
        })}
      </div>

      {/* La somma conta come risultato; per vantaggio/svantaggio il risultato è
          il dado tenuto, già in evidenza sopra. */}
      {kept === undefined && (
        <span
          className="font-display text-2xl font-black sm:text-3xl"
          style={totalColor ? { color: totalColor } : undefined}
        >
          = {roll.result}
        </span>
      )}
    </div>
  );
}
