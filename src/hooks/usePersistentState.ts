/**
 * Stato di interfaccia che sopravvive al ricaricamento.
 *
 * Serve per le preferenze di visualizzazione — gruppi chiusi, pannelli aperti —
 * che non appartengono alla campagna e quindi non devono finire né nel file
 * esportato né sul database, ma che è irritante dover reimpostare ogni volta.
 */

import { useCallback, useEffect, useState } from 'react';

export function usePersistentState<T>(
  key: string,
  initial: T,
  /** Difesa contro valori salvati non più validi dopo un aggiornamento. */
  validate?: (value: unknown) => value is T,
): [T, (value: T | ((current: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      const parsed: unknown = JSON.parse(raw);
      if (validate && !validate(parsed)) return initial;
      return parsed as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* preferenza non essenziale: se non si può salvare, si prosegue */
    }
  }, [key, value]);

  const update = useCallback((next: T | ((current: T) => T)) => setValue(next), []);

  return [value, update];
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/** Insieme di chiavi memorizzato come lista, con API a insieme. */
export function usePersistentSet(key: string): {
  has: (id: string) => boolean;
  toggle: (id: string) => void;
} {
  const [items, setItems] = usePersistentState<string[]>(key, [], isStringArray);

  return {
    has: useCallback((id: string) => items.includes(id), [items]),
    toggle: useCallback(
      (id: string) =>
        setItems((current) =>
          current.includes(id) ? current.filter((i) => i !== id) : [...current, id],
        ),
      [setItems],
    ),
  };
}
