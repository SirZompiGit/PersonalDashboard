import type { CampaignState } from '../types';
import { DEFAULT_DICE } from '../lib/dice';
import { DEFAULT_HEALTH_GROUPS } from '../lib/healthBars';
import { DEFAULT_LOGO_VARIANT, DEFAULT_STYLE, DEFAULT_THEME } from '../theme';

export const DEFAULT_DICE_LABELS = [
  'Tiro salvezza',
  'Tiro attacco',
  'Prova di abilità',
  'Percezione',
  'Danno',
];

/** Campagna vuota, usata dal Reset Completo. */
export function createEmptyCampaign(): CampaignState {
  return {
    title: 'Nuova Campagna',
    scheduleDay: '',
    scheduleTime: '',
    players: [],
    healthBars: [],
    notes: '',
    campaignNotes: '',
    lastRoll: null,
    rollHistory: [],
    isRollHidden: false,
    selectedDice: DEFAULT_DICE,
    activePlayerId: null,
    theme: DEFAULT_THEME,
    style: DEFAULT_STYLE,
    logoVariant: DEFAULT_LOGO_VARIANT,
    healthGroups: [...DEFAULT_HEALTH_GROUPS],
    diceLabels: [...DEFAULT_DICE_LABELS],
  };
}

/** Campagna d'esempio mostrata al primo avvio, quando non c'è nulla di salvato. */
export function createSeedCampaign(): CampaignState {
  return {
    ...createEmptyCampaign(),
    title: 'Le Cronache di Elidon - Capitolo IV',
    players: [
      {
        id: 'p1',
        name: "Kaelen l'Elfo Silvano",
        inventory: [
          { id: 'i1', name: 'Arco Lungo del Vento' },
          { id: 'i2', name: 'Pozione di cura maggiore (x2)' },
          { id: 'i3', name: 'Rampino di ferro silvano' },
        ],
        bonus: [
          { id: 'b1', name: '+3 Iniziativa nelle foreste' },
          { id: 'b2', name: 'Scurovisione fino a 18 metri' },
        ],
      },
      {
        id: 'p2',
        name: 'Durnar il Barbaro Nano',
        inventory: [
          { id: 'i4', name: 'Ascia bipenne delle tempeste' },
          { id: 'i5', name: 'Amuleto del cuore di pietra' },
        ],
        bonus: [
          { id: 'b3', name: 'Immunità al veleno nanico' },
          { id: 'b4', name: 'Vantaggio sui tiri contro paura' },
        ],
      },
      {
        id: 'p3',
        name: 'Zephyr il Ladro Tiefling',
        inventory: [
          { id: 'i6', name: "Pugnale dell'ombra tagliente" },
          { id: 'i7', name: 'Attrezzi da scasso incantati' },
        ],
        bonus: [{ id: 'b5', name: '+5 alle prove di Furtività' }],
      },
    ],
    healthBars: [
      {
        id: 'h1',
        name: 'Drago Rosso Antico',
        currentValue: 62,
        maxValue: 100,
        colorMode: 'gradient',
        staticColor: '#ef4444',
        gradientColors: { low: '#dc2626', mid: '#f59e0b', high: '#10b981' },
        group: 'Nemici',
        zeroHpText: 'DEFUNTO',
      },
      {
        id: 'h2',
        name: 'Capo dei Goblin',
        currentValue: 12,
        maxValue: 25,
        colorMode: 'static',
        staticColor: '#ef4444',
        gradientColors: { low: '#ef4444', mid: '#ef4444', high: '#ef4444' },
        group: 'Nemici',
        zeroHpText: 'DEFUNTO',
      },
      {
        id: 'h3',
        name: 'Alleato: Chierico PNG',
        currentValue: 30,
        maxValue: 30,
        colorMode: 'gradient',
        staticColor: '#10b981',
        gradientColors: { low: '#dc2626', mid: '#ef4444', high: '#10b981' },
        group: 'Alleati',
        zeroHpText: 'DEFUNTO',
      },
    ],
    notes:
      'Sotto le rovine di Elidon, il gruppo ha infine risvegliato il Drago Rosso Antico.\n\nNote di gioco:\n- Il drago lancia soffio di fuoco ogni 3 turni.\n- Zephyr ha posizionato una trappola vicino alla colonna est.\n- PNG Chierico cura il barbaro se scende sotto i 15 HP.',
    campaignNotes:
      'Appunti pubblici della campagna:\n- Trovare il fabbro nella città bassa.\n- Pagare il debito alla gilda dei ladri (500mo).',
  };
}
