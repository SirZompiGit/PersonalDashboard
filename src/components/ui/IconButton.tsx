/**
 * Pulsante icona con etichetta accessibile e suggerimento stilizzato.
 *
 * Prima i pulsanti icona si affidavano all'attributo `title`: nessuna etichetta
 * per i lettori di schermo, comparsa dopo un secondo abbondante e aspetto di
 * sistema, fuori dal design.
 *
 * `label` diventa sia `aria-label` sia testo del suggerimento: è impossibile
 * dimenticarne uno dei due.
 */

import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';

type Tone = 'neutral' | 'accent' | 'danger' | 'positive';

const TONES: Record<Tone, string> = {
  neutral: 'text-slate-400 hover:text-slate-100 hover:bg-bento-button',
  accent: 'text-slate-400 hover:text-theme-400 hover:bg-bento-button',
  danger: 'text-slate-400 hover:text-red-400 hover:bg-red-500/10',
  positive: 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10',
};

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  /** Etichetta accessibile e testo del suggerimento. Obbligatoria. */
  label: string;
  children: ReactNode;
  tone?: Tone;
  /** Posizione del suggerimento rispetto al pulsante. */
  tip?: 'top' | 'bottom' | 'left';
  active?: boolean;
}

const TIP_POSITION = {
  top: 'bottom-full left-1/2 mb-1.5 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-1.5 -translate-x-1/2',
  left: 'right-full top-1/2 mr-1.5 -translate-y-1/2',
} as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, tone = 'neutral', tip = 'top', active = false, className = '', ...rest },
  ref,
) {
  return (
    <span className="group/tip relative inline-flex">
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={`inline-flex items-center justify-center rounded-lg p-1.5 transition-colors duration-200 ${
          active ? 'bg-bento-button text-theme-400' : TONES[tone]
        } ${className}`}
        {...rest}
      >
        {children}
      </button>

      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-bento-border bg-bento-void px-2 py-1 text-[10px] font-medium text-slate-200 opacity-0 shadow-raised transition-opacity duration-200 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 ${TIP_POSITION[tip]}`}
      >
        {label}
      </span>
    </span>
  );
});
