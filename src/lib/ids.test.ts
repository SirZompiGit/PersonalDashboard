import { afterEach, describe, expect, it } from 'vitest';
import { newId, newUserId } from './ids';

const realCrypto = globalThis.crypto;

afterEach(() => {
  Object.defineProperty(globalThis, 'crypto', { value: realCrypto, configurable: true });
});

describe('newId', () => {
  it('genera identificatori distinti', () => {
    const ids = new Set(Array.from({ length: 1000 }, newId));
    expect(ids.size).toBe(1000);
  });

  /**
   * `crypto.randomUUID` esiste solo in contesto sicuro. Lo script di sviluppo
   * ascolta su 0.0.0.0 perché i giocatori si colleghino via IP su http: lì
   * mancava, e aggiungere un giocatore lanciava un'eccezione con schermo bianco.
   */
  it('funziona anche senza crypto, come su http via IP di rete', () => {
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });

    const ids = new Set(Array.from({ length: 500 }, newId));
    expect(ids.size).toBe(500);
    expect(ids.has('')).toBe(false);
  });

  it('funziona con getRandomValues ma senza randomUUID', () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: { getRandomValues: realCrypto.getRandomValues.bind(realCrypto) },
      configurable: true,
    });

    const id = newId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('newUserId', () => {
  it('mantiene il prefisso atteso dal database', () => {
    expect(newUserId()).toMatch(/^user_[0-9a-f]{9}$/);
  });
});
