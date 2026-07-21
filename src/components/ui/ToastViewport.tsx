/**
 * Area di comparsa delle notifiche.
 * In basso a destra su schermi larghi, a tutta larghezza in basso su telefono,
 * dove l'angolo è difficile da raggiungere col pollice.
 */

import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, Undo2, X } from 'lucide-react';
import { useToasts } from '../../hooks/useToasts';

const ICONS = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
} as const;

const TONES = {
  info: 'border-bento-border text-slate-200',
  success: 'border-emerald-500/40 text-emerald-300',
  error: 'border-red-500/40 text-red-300',
} as const;

export function ToastViewport() {
  const { toasts, dismiss } = useToasts();

  if (toasts.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-3 bottom-3 z-[10000] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-96"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border bg-bento-panel/95 px-4 py-3 shadow-overlay backdrop-blur-md animate-slide-up ${TONES[toast.kind]}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <p className="min-w-0 flex-1 text-xs leading-snug font-medium text-slate-200">
              {toast.message}
            </p>

            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.run();
                  dismiss(toast.id);
                }}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-theme-500/40 bg-theme-600/15 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-theme-400 transition-colors duration-200 hover:bg-theme-600/30"
              >
                <Undo2 className="h-3 w-3" />
                {toast.action.label}
              </button>
            )}

            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Chiudi notifica"
              className="shrink-0 rounded p-1 text-slate-500 transition-colors duration-200 hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
