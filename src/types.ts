import { CampaignTheme } from './theme';

export interface InventoryItem {
  id: string;
  name: string;
}

export interface BonusItem {
  id: string;
  name: string;
}

export interface Player {
  id: string;
  name: string;
  inventory: InventoryItem[];
  bonus: BonusItem[];
}

export interface GradientColors {
  low: string;   // color for low health (e.g. 0-33%)
  mid: string;   // color for mid health (e.g. 34-66%)
  high: string;  // color for high health (e.g. 67-100%)
}

export interface HealthBar {
  id: string;
  name: string;
  currentValue: number;
  maxValue: number;
  colorMode: 'static' | 'gradient';
  staticColor: string;
  gradientColors: GradientColors;
  group?: string; // Optional group name for categorization
  zeroHpText?: string; // Custom text when HP is 0
}

export interface RollResult {
  diceType: string;
  result: number;
  timestamp: number;
  label?: string; // Optional label for the roll
}

export interface CampaignState {
  title: string;
  scheduleDay?: string;
  scheduleTime?: string;
  players: Player[];
  healthBars: HealthBar[];
  notes: string; // Used as Master Notes
  campaignNotes?: string; // Used as Campaign Notes
  lastRoll: RollResult | null;
  rollHistory?: RollResult[];
  isRollHidden?: boolean;
  selectedDice: string;
  activePlayerId: string | null;
  theme?: CampaignTheme;
  healthGroups?: string[]; // Custom health bar groups
  diceLabels?: string[]; // Custom dice roll labels
}
