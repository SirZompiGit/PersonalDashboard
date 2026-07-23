import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOGO_VARIANT,
  DEFAULT_STYLE,
  LOGO_VARIANTS,
  STYLES,
  THEMES,
  normalizeLogoVariant,
  normalizeStyle,
  normalizeTheme,
} from './theme';

describe('temi di colore', () => {
  it('conserva le chiavi storiche, che sono salvate nelle campagne', () => {
    for (const id of ['crimson', 'emerald', 'sapphire', 'amber']) {
      expect(THEMES.some((t) => t.id === id)).toBe(true);
      expect(normalizeTheme(id)).toBe(id);
    }
  });

  it('ricade sul predefinito su valori sconosciuti', () => {
    expect(normalizeTheme('boh')).toBe('crimson');
    expect(normalizeTheme(null)).toBe('crimson');
    expect(normalizeTheme(42)).toBe('crimson');
  });

  /**
   * Vampiro e Bardo erano entrambi rossi e distavano 10° sulla ruota dei
   * colori: a schermo risultavano indistinguibili.
   */
  it('non ha due colori confondibili', () => {
    const swatches = THEMES.map((t) => t.swatch);
    expect(new Set(swatches).size).toBe(THEMES.length);

    const bardo = THEMES.find((t) => t.id === 'rose');
    const vampiro = THEMES.find((t) => t.id === 'crimson');
    expect(bardo?.swatch).not.toBe('#f43f5e');
    expect(bardo?.swatch).not.toBe(vampiro?.swatch);
  });
});

describe('design', () => {
  it('il predefinito esiste nell elenco', () => {
    expect(STYLES.some((s) => s.id === DEFAULT_STYLE)).toBe(true);
  });

  it('accetta quelli in elenco', () => {
    for (const style of STYLES) {
      expect(normalizeStyle(style.id)).toBe(style.id);
    }
  });

  /**
   * I design rimossi lungo il percorso non devono impedire di riaprire una
   * campagna che li aveva salvati.
   */
  it('fa ricadere sul predefinito i design rimossi', () => {
    for (const removed of ['bento', 'compatto', 'sangue-scuro', 'sangue-chiaro']) {
      expect(normalizeStyle(removed)).toBe(DEFAULT_STYLE);
    }
    expect(normalizeStyle(undefined)).toBe(DEFAULT_STYLE);
  });
});

describe('variante del marchio', () => {
  it('ne offre due', () => {
    expect(LOGO_VARIANTS.map((v) => v.id)).toEqual(['normal', 'colored']);
  });

  it('parte da quella originale', () => {
    expect(DEFAULT_LOGO_VARIANT).toBe('normal');
  });

  it('accetta solo i valori previsti', () => {
    expect(normalizeLogoVariant('colored')).toBe('colored');
    expect(normalizeLogoVariant('normal')).toBe('normal');
    // Le campagne salvate prima non hanno il campo.
    expect(normalizeLogoVariant(undefined)).toBe('normal');
    expect(normalizeLogoVariant('arcobaleno')).toBe('normal');
    expect(normalizeLogoVariant(42)).toBe('normal');
  });
});
