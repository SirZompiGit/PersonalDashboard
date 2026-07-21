/**
 * Notifiche non bloccanti, con azione di annullamento.
 *
 * Sostituisce i cinque `alert()` / `confirm()` bloccanti sparsi nell'app, che
 * fermavano il browser e stonavano con tutto il resto dell'interfaccia.
 *
 * L'azione "Annulla" è la rete di sicurezza sulle cancellazioni: prima
 * eliminare un giocatore o una barra vita era istantaneo e definitivo.
 */

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { newId } from '../lib/ids';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  /** Etichetta e azione del pulsante di annullamento, se presente. */
  action?: { label: string; run: () => void };
}

interface ToastOptions {
  kind?: ToastKind;
  duration?: number;
  action?: { label: string; run: () => void };
}

interface ToastContextValue {
  toasts: Toast[];
  notify: (message: string, options?: ToastOptions) => string;
  /** Scorciatoia per il caso più comune: "eliminato — Annulla". */
  notifyUndo: (message: string, undo: () => void) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4000;
const UNDO_DURATION = 7000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = newId();
      const { kind = 'info', duration = DEFAULT_DURATION, action } = options;

      setToasts((current) => [...current.slice(-3), { id, kind, message, action }]);

      const timer = setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);

      return id;
    },
    [dismiss],
  );

  const notifyUndo = useCallback(
    (message: string, undo: () => void) =>
      notify(message, {
        duration: UNDO_DURATION,
        action: { label: 'Annulla', run: undo },
      }),
    [notify],
  );

  const value = useMemo(
    () => ({ toasts, notify, notifyUndo, dismiss }),
    [toasts, notify, notifyUndo, dismiss],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToasts(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToasts richiede che il componente sia dentro <ToastProvider>');
  }
  return context;
}
