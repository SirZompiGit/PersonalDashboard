/**
 * Schermata vuota curata.
 * Prima ogni sezione aveva la sua variante di testo grigio in corsivo.
 */

import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  size?: 'sm' | 'md';
}

export function EmptyState({ icon: Icon, title, hint, size = 'md' }: EmptyStateProps) {
  const compact = size === 'sm';

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-bento-border bg-bento-bg text-center ${
        compact ? 'px-3 py-5' : 'px-4 py-8'
      }`}
    >
      <span
        className={`flex items-center justify-center rounded-full border border-bento-border bg-bento-panel text-slate-600 ${
          compact ? 'h-8 w-8' : 'h-10 w-10'
        }`}
      >
        <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </span>
      <p className={`font-medium text-slate-400 ${compact ? 'text-xs' : 'text-sm'}`}>{title}</p>
      {hint && <p className="max-w-xs text-[11px] leading-snug text-slate-600">{hint}</p>}
    </div>
  );
}
