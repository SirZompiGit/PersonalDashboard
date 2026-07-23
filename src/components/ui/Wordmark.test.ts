import { describe, expect, it } from 'vitest';
import { resolveWordmark } from './Wordmark';
import { STYLES } from '../../theme';

const DARK_STYLES = STYLES.map((s) => s.id).filter((id) => id !== 'white');

describe('variante Normale', () => {
  it('usa l oro su tutti i design scuri', () => {
    for (const style of DARK_STYLES) {
      expect(resolveWordmark(style, 'normal')).toEqual({
        mode: 'image',
        src: '/logo-fantasia.png',
      });
    }
  });

  /** È l'unico caso in cui serve la versione nera: l'oro su chiaro sparisce. */
  it('usa il nero solo sul design chiaro', () => {
    expect(resolveWordmark('white', 'normal')).toEqual({
      mode: 'image',
      src: '/logo-fantasia-black.png',
    });
  });
});

describe('variante Colorato', () => {
  /**
   * Il colorato vale con QUALUNQUE design, compreso quello chiaro: prende il
   * colore del tema, che è leggibile su entrambi i fondi. Farlo ricadere sul
   * nero rendeva le due anteprime identiche.
   */
  it('colora la sagoma bianca con ogni design, chiaro incluso', () => {
    for (const style of STYLES.map((s) => s.id)) {
      expect(resolveWordmark(style, 'colored')).toEqual({
        mode: 'masked',
        src: '/logo-fantasia-white.png',
      });
    }
  });

  it('non usa mai il file nero', () => {
    for (const style of STYLES.map((s) => s.id)) {
      expect(resolveWordmark(style, 'colored').src).not.toContain('black');
    }
  });
});

describe('le due varianti restano distinguibili', () => {
  it('su ogni design danno esiti diversi', () => {
    for (const style of STYLES.map((s) => s.id)) {
      const normal = resolveWordmark(style, 'normal');
      const colored = resolveWordmark(style, 'colored');
      expect(normal).not.toEqual(colored);
    }
  });
});
