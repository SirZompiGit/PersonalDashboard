/**
 * Finestra modale accessibile.
 *
 * Prima l'app aveva quattro modali copiati a mano: nessuno dichiarava
 * `role="dialog"`, nessuno si chiudeva con Esc, nessuno tratteneva il focus, e
 * tutti usavano `animate-fadeIn` — una classe che non esisteva, quindi
 * apparivano di scatto.
 */

import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Contenuti a destra dell'intestazione (ricerca, azioni). */
  toolbar?: ReactNode;
  children: ReactNode;
  /** Larghezza massima del pannello. */
  size?: 'md' | 'lg' | 'xl';
}

const SIZES = {
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
} as const;

export function Modal({ open, onClose, title, toolbar, children, size = 'xl' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', handleKeyDown);

    // Blocca lo scorrimento della pagina sotto la modale.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Porta il focus dentro la modale, così tastiera e lettori di schermo
    // non restano sulla pagina sottostante.
    const timer = window.setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    }, 0);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
      restoreFocusRef.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm animate-fade-in sm:p-6 md:p-8"
      onPointerDown={(event) => {
        // Solo un tocco sullo sfondo chiude: così trascinare una selezione dal
        // contenuto fino al bordo non fa sparire la finestra.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={`relative flex h-full max-h-[92vh] w-full ${SIZES[size]} flex-col overflow-hidden rounded-2xl border border-bento-border bg-bento-panel p-4 shadow-overlay animate-slide-up sm:p-6`}
      >
        <div className="mb-4 flex shrink-0 flex-col gap-3 border-b border-bento-border pb-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex shrink-0 items-center gap-2 font-mono text-sm font-bold uppercase tracking-wider text-slate-200">
            {title}
          </h2>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {toolbar}
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi"
              className="rounded-lg border border-bento-border bg-bento-button p-2 text-slate-300 transition-colors duration-200 hover:bg-bento-border hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
