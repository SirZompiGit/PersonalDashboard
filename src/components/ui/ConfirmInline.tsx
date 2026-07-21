/**
 * Conferma in linea "Sei sicuro? Sì / No".
 *
 * Lo stesso blocco era copiato tre volte (impostazioni, etichette dei dadi,
 * gruppi delle barre vita), ogni volta con marcatura e colori leggermente
 * diversi.
 */

interface ConfirmInlineProps {
  question: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` per le azioni distruttive, `neutral` per il resto. */
  tone?: 'danger' | 'neutral';
  /** `block` riempie la riga, `inline` resta compatto. */
  layout?: 'block' | 'inline';
}

export function ConfirmInline({
  question,
  onConfirm,
  onCancel,
  confirmLabel = 'Sì',
  cancelLabel = 'No',
  tone = 'danger',
  layout = 'inline',
}: ConfirmInlineProps) {
  const confirmClasses =
    tone === 'danger'
      ? 'bg-red-600 hover:bg-red-500 text-white'
      : 'bg-theme-600 hover:bg-theme-500 text-white';

  if (layout === 'block') {
    return (
      <div className="space-y-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-center animate-fade-in">
        <p className="font-mono text-[11px] font-semibold leading-normal text-red-300">
          {question}
        </p>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded px-3 py-1.5 font-mono text-[10px] font-bold transition-colors duration-200 ${confirmClasses}`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-bento-border bg-bento-button px-3 py-1.5 font-mono text-[10px] font-bold text-slate-300 transition-colors duration-200 hover:bg-bento-border"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-grow items-center justify-between gap-2 animate-fade-in">
      <span className="min-w-0 truncate text-[11px] font-semibold text-slate-200">
        {question}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded px-2 py-0.5 text-[10px] font-bold transition-colors duration-200 ${confirmClasses}`}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-200 transition-colors duration-200 hover:bg-slate-600"
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
