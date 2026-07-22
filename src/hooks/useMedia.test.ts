import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MEDIA,
  LARGE_IMAGE_BYTES,
  MAX_STORED_BYTES,
  normalizeMedia,
} from './useMedia';

describe('limiti di dimensione', () => {
  it('accetta immagini fino a 8 MB', () => {
    expect(MAX_STORED_BYTES).toBe(8 * 1024 * 1024);
  });

  it('avvisa ben prima di rifiutare', () => {
    expect(LARGE_IMAGE_BYTES).toBeLessThan(MAX_STORED_BYTES);
  });

  /**
   * Il Realtime Database rifiuta le stringhe oltre i 10 MB: il limite
   * dell'app deve restare sotto, altrimenti l'immagine si salva in locale ma
   * non raggiunge mai i giocatori.
   */
  it('resta sotto il tetto del database', () => {
    expect(MAX_STORED_BYTES).toBeLessThan(10 * 1024 * 1024);
  });
});

/**
 * Queste impostazioni arrivano anche dal database, dove le scrive il master.
 * Un dato corrotto non deve poter rompere la vista di un giocatore.
 */
describe('normalizeMedia', () => {
  it('parte senza immagini', () => {
    expect(DEFAULT_MEDIA.source).toBeNull();
    expect(DEFAULT_MEDIA.scene).toBeNull();
  });

  it.each([null, undefined, 42, 'testo', [], {}, { source: 5 }, { scene: {} }])(
    'normalizza senza lanciare: %s',
    (input) => {
      const media = normalizeMedia(input);
      expect(typeof media.repeat).toBe('boolean');
      expect(typeof media.blur).toBe('number');
      expect(typeof media.opacity).toBe('number');
    },
  );

  it('scarta le sorgenti che non sono stringhe', () => {
    expect(normalizeMedia({ source: 123 }).source).toBeNull();
    expect(normalizeMedia({ scene: [] }).scene).toBeNull();
  });

  it('conserva le sorgenti valide', () => {
    expect(normalizeMedia({ source: 'https://x/y.jpg' }).source).toBe('https://x/y.jpg');
    expect(normalizeMedia({ scene: 'data:image/jpeg;base64,AAA' }).scene).toBe(
      'data:image/jpeg;base64,AAA',
    );
  });

  it('riporta i valori fuori scala entro i limiti', () => {
    expect(normalizeMedia({ blur: 9999 }).blur).toBe(40);
    expect(normalizeMedia({ blur: -5 }).blur).toBe(0);
    expect(normalizeMedia({ opacity: 8 }).opacity).toBe(1);
    // Un velo minimo resta sempre: a zero l'immagine sparirebbe del tutto.
    expect(normalizeMedia({ opacity: 0 }).opacity).toBe(0.05);
  });

  it('non accetta una ripetizione che non sia booleana', () => {
    expect(normalizeMedia({ repeat: 'si' }).repeat).toBe(false);
    expect(normalizeMedia({ repeat: true }).repeat).toBe(true);
  });
});
