export type CampaignTheme = 'crimson' | 'emerald' | 'sapphire' | 'amber';

export interface ThemeColors {
  text: string;
  bg: string;
  hoverBg: string;
  border: string;
  borderActive: string;
  ring: string;
  badge: string;
  shadow: string;
  textActive: string;
  fill: string;
  glow: string;
  glowBg: string;
}

export const getThemeColors = (theme: CampaignTheme): ThemeColors => {
  switch (theme) {
    case 'emerald':
      return {
        text: 'text-emerald-500',
        bg: 'bg-emerald-600',
        hoverBg: 'hover:bg-emerald-500',
        border: 'border-emerald-500',
        borderActive: 'border-emerald-500',
        ring: 'ring-emerald-500/20',
        badge: 'bg-emerald-950/20 text-emerald-500 border-emerald-500/30',
        shadow: 'shadow-emerald-950/20',
        textActive: 'text-emerald-400',
        fill: 'fill-emerald-500',
        glow: 'from-emerald-600/5',
        glowBg: 'bg-emerald-500/5',
      };
    case 'sapphire':
      return {
        text: 'text-blue-500',
        bg: 'bg-blue-600',
        hoverBg: 'hover:bg-blue-500',
        border: 'border-blue-500',
        borderActive: 'border-blue-500',
        ring: 'ring-blue-500/20',
        badge: 'bg-blue-950/20 text-blue-500 border-blue-500/30',
        shadow: 'shadow-blue-950/20',
        textActive: 'text-blue-400',
        fill: 'fill-blue-500',
        glow: 'from-blue-600/5',
        glowBg: 'bg-blue-500/5',
      };
    case 'amber':
      return {
        text: 'text-amber-500',
        bg: 'bg-amber-600',
        hoverBg: 'hover:bg-amber-500',
        border: 'border-amber-500',
        borderActive: 'border-amber-500',
        ring: 'ring-amber-500/20',
        badge: 'bg-amber-950/20 text-amber-500 border-amber-500/30',
        shadow: 'shadow-amber-950/20',
        textActive: 'text-amber-400',
        fill: 'fill-amber-500',
        glow: 'from-amber-600/5',
        glowBg: 'bg-amber-500/5',
      };
    case 'crimson':
    default:
      return {
        text: 'text-red-500',
        bg: 'bg-red-600',
        hoverBg: 'hover:bg-red-500',
        border: 'border-red-500',
        borderActive: 'border-red-500',
        ring: 'ring-red-500/20',
        badge: 'bg-red-950/20 text-red-500 border-red-500/30',
        shadow: 'shadow-red-950/20',
        textActive: 'text-red-400',
        fill: 'fill-red-500',
        glow: 'from-red-600/5',
        glowBg: 'bg-red-500/5',
      };
  }
};
