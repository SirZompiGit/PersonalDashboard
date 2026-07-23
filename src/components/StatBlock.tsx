/**
 * Le sei statistiche di un personaggio, in griglia 3 × 2.
 *
 * Un solo componente per i tre posti in cui compaiono: la scheda PG in
 * dashboard (modificabile dal master), la scheda personale del giocatore
 * (modificabile se il master ha passato il controllo) e la condivisione (sola
 * lettura). La sigla è nella cella, il nome completo nel tooltip — così ogni
 * cella si spiega da sola anche nella colonna stretta della proiezione.
 */

import { clampStat, readStats, statAbbr } from '../lib/stats';
import { Tooltip } from './ui/Tooltip';

interface StatBlockProps {
  labels: string[];
  /** Valori grezzi dal Player; i mancanti ricadono sul default. */
  stats: number[] | undefined;
  /** Assente = sola lettura. Riceve l'intero array aggiornato. */
  onChange?: (next: number[]) => void;
  /** Più compatta per la colonna della condivisione. */
  dense?: boolean;
}

export function StatBlock({ labels, stats, onChange, dense = false }: StatBlockProps) {
  const values = readStats(stats);
  const editable = Boolean(onChange);

  const setAt = (index: number, raw: number) => {
    if (!onChange) return;
    const next = values.slice();
    next[index] = clampStat(raw);
    onChange(next);
  };

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {labels.map((label, index) => (
        <Tooltip key={index} label={label} className="w-full">
          <div
            className={`flex w-full flex-col items-center rounded-lg border border-bento-border bg-bento-bg ${
              dense ? 'px-1 py-1' : 'px-1.5 py-1.5'
            }`}
          >
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
              {statAbbr(label)}
            </span>
            {editable ? (
              <input
                type="number"
                inputMode="numeric"
                value={values[index]}
                onChange={(event) => setAt(index, Number.parseInt(event.target.value, 10) || 0)}
                aria-label={label}
                className={`w-full bg-transparent text-center font-display font-black text-slate-100 focus:outline-none ${
                  dense ? 'text-base' : 'text-lg'
                }`}
              />
            ) : (
              <span
                className={`font-display font-black text-slate-100 ${
                  dense ? 'text-base' : 'text-lg'
                }`}
              >
                {values[index]}
              </span>
            )}
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
