/**
 * Generazione di identificatori.
 *
 * `crypto.randomUUID()` esiste solo in contesto sicuro (https o localhost).
 * Lo script di sviluppo è `vite --host=0.0.0.0`, pensato proprio per essere
 * aperto dai giocatori via IP di rete su http: lì `crypto.randomUUID` è
 * `undefined` e aggiungere un giocatore o una barra vita lanciava un'eccezione,
 * lasciando lo schermo bianco.
 */

let counter = 0;

export function newId(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;

  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }

  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    // Marca la versione 4 come farebbe randomUUID.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  counter += 1;
  return `id-${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Identificativo utente per le stanze. Formato invariato: `user_xxxxxxxxx`. */
export function newUserId(): string {
  return 'user_' + newId().replace(/-/g, '').slice(0, 9);
}
