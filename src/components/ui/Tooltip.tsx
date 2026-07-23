/**
 * Nuvoletta esplicativa per elementi che **non** sono bottoni: celle
 * statistiche, targhette di stato, pastiglie colore.
 *
 * `IconButton` ha già il suo tooltip per i controlli icona; questo copre tutto
 * il resto, così ogni icona senza un'etichetta accanto può spiegarsi da sola al
 * passaggio del mouse o al focus da tastiera, invece di affidarsi al `title`
 * nativo (lento e fuori stile).
 */

import type { ReactNode } from 'react';

type Tip = 'top' | 'bottom' | 'left' | 'right';

const TIP_POSITION: Record<Tip, string> = {
  top: 'bottom-full left-1/2 mb-1.5 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-1.5 -translate-x-1/2',
  left: 'right-full top-1/2 mr-1.5 -translate-y-1/2',
  right: 'left-full top-1/2 ml-1.5 -translate-y-1/2',
};

interface TooltipProps {
  /** Testo della nuvoletta. */
  label: string;
  children: ReactNode;
  tip?: Tip;
  className?: string;
  /**
   * Rende il contenitore focalizzabile per far comparire la nuvoletta da
   * tastiera. Va lasciato `false` quando dentro c'è già un elemento
   * focalizzabile (un bottone): eviterebbe di raddoppiare la tappa di tab e di
   * sovrapporre due etichette. In quel caso il figlio porta la propria
   * `aria-label` e il focus su di esso mostra comunque la nuvoletta.
   */
  focusable?: boolean;
}

export function Tooltip({
  label,
  children,
  tip = 'top',
  className = '',
  focusable = true,
}: TooltipProps) {
  return (
    <span
      className={`group/tip relative inline-flex ${className}`}
      tabIndex={focusable ? 0 : undefined}
      aria-label={focusable ? label : undefined}
    >
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-bento-border bg-bento-void px-2 py-1 text-[10px] font-medium text-slate-200 opacity-0 shadow-raised transition-opacity duration-200 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 ${TIP_POSITION[tip]}`}
      >
        {label}
      </span>
    </span>
  );
}
