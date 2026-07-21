/**
 * Temi di FANTASIA.
 *
 * Prima questo file esportava `getThemeColors()`, che restituiva stringhe di
 * classi Tailwind poi composte a runtime nei componenti (`hover:${colors.hoverBg}`).
 * Tailwind estrae i nomi delle classi dal testo sorgente a build time, quindi
 * quelle classi non venivano MAI generate: hover, focus ring e trasparenze
 * legate al tema erano no-op silenziosi in ~127 punti dell'interfaccia.
 *
 * Ora il tema vive in variabili CSS su <html data-theme="...">, definite in
 * index.css. I componenti usano classi statiche reali: `bg-theme-600`,
 * `hover:bg-theme-500`, `focus:ring-theme-500/20`, `text-theme-400`.
 */

export type CampaignTheme =
  | 'crimson'
  | 'emerald'
  | 'sapphire'
  | 'amber'
  | 'amethyst'
  | 'abyss'
  | 'rose'
  | 'obsidian';

export const DEFAULT_THEME: CampaignTheme = 'crimson';

export interface ThemeDefinition {
  id: CampaignTheme;
  /** Nome mostrato nel selettore temi. */
  label: string;
  /** Colore del pallino nel selettore. Statico: non dipende dal tema attivo. */
  swatch: string;
  /** Esadecimale del colore d'accento, per canvas/particelle che non usano CSS. */
  accent: string;
}

/**
 * I quattro temi storici conservano chiave e colori esatti, così le campagne
 * già salvate (localStorage e database) si riaprono identiche.
 */
export const THEMES: ThemeDefinition[] = [
  { id: 'crimson', label: 'Vampiro', swatch: '#ef4444', accent: '#ef4444' },
  { id: 'emerald', label: 'Druido', swatch: '#10b981', accent: '#10b981' },
  { id: 'sapphire', label: 'Mago', swatch: '#3b82f6', accent: '#3b82f6' },
  { id: 'amber', label: 'Oste', swatch: '#f59e0b', accent: '#f59e0b' },
  { id: 'amethyst', label: 'Stregone', swatch: '#8b5cf6', accent: '#8b5cf6' },
  { id: 'abyss', label: 'Monaco', swatch: '#06b6d4', accent: '#06b6d4' },
  // Chiave invariata per compatibilità; il colore è magenta, non più rosa.
  { id: 'rose', label: 'Bardo', swatch: '#d946ef', accent: '#d946ef' },
  { id: 'obsidian', label: 'Ladro', swatch: '#94a3b8', accent: '#94a3b8' },
];

/**
 * Asse indipendente dal colore: cambia forme, densità e tipografia, non la
 * palette. I due assi si combinano liberamente (8 colori × 3 design).
 */
export type CampaignStyle =
  | 'grimorio'
  | 'arcano'
  | 'runico'
  | 'sangue-scuro'
  | 'sangue-chiaro';

export const DEFAULT_STYLE: CampaignStyle = 'grimorio';

export interface StyleDefinition {
  id: CampaignStyle;
  label: string;
  hint: string;
}

/**
 * Tre linguaggi visivi distinti, non tre regolazioni dello stesso.
 * Cambiano forme, superfici, profondità e carattere tipografico; il colore
 * resta guidato dal tema scelto.
 */
export const STYLES: StyleDefinition[] = [
  { id: 'grimorio', label: 'Grimorio', hint: 'Angoli vivi, bordi spessi, serif' },
  { id: 'arcano', label: 'Arcano', hint: 'Vetro sfocato, aloni di luce, curve ampie' },
  { id: 'runico', label: 'Runico', hint: 'Piatto, monospace, nessuna curva' },
  { id: 'sangue-scuro', label: 'Sangue Scuro', hint: 'Marmo nero, venature del tema' },
  { id: 'sangue-chiaro', label: 'Sangue Chiaro', hint: 'Marmo avorio, testo scuro' },
];

const THEME_IDS = new Set<string>(THEMES.map((t) => t.id));
const STYLE_IDS = new Set<string>(STYLES.map((s) => s.id));

export function normalizeStyle(value: unknown): CampaignStyle {
  return typeof value === 'string' && STYLE_IDS.has(value)
    ? (value as CampaignStyle)
    : DEFAULT_STYLE;
}

/** Normalizza un valore arrivato da localStorage o dal database. */
export function normalizeTheme(value: unknown): CampaignTheme {
  return typeof value === 'string' && THEME_IDS.has(value)
    ? (value as CampaignTheme)
    : DEFAULT_THEME;
}

export function getThemeDefinition(theme: CampaignTheme): ThemeDefinition {
  return THEMES.find((t) => t.id === theme) ?? THEMES[0];
}

/** Esadecimale d'accento, per le particelle disegnate via style inline. */
export function getThemeAccent(theme: CampaignTheme): string {
  return getThemeDefinition(theme).accent;
}

/**
 * Applica il tema al documento.
 *
 * La classe `theme-transitions` viene aggiunta solo dopo il primo paint: le
 * proprietà registrate con @property sono interpolabili, e senza questa
 * accortezza al primo caricamento si vedrebbe una dissolvenza dal colore
 * iniziale a quello salvato.
 */
export function applyTheme(theme: CampaignTheme, style: CampaignStyle = DEFAULT_STYLE): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.dataset.theme = normalizeTheme(theme);
  root.dataset.style = normalizeStyle(style);

  if (!root.classList.contains('theme-transitions')) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => root.classList.add('theme-transitions'));
    });
  }
}
