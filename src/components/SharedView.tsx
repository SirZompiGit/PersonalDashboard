import React from 'react';
import { CampaignState, Player, HealthBar } from '../types';
import { Shield, Sparkles, AlertCircle, Heart, Star } from 'lucide-react';
import { CampaignTheme, getThemeColors } from '../theme';

interface SharedViewProps {
  state: CampaignState;
}

export const SharedView: React.FC<SharedViewProps> = ({ state }) => {
  const { title, players, healthBars, lastRoll, theme = 'crimson' } = state;
  const colors = getThemeColors(theme);
  const colorName = theme === 'sapphire' ? 'blue' : theme === 'crimson' ? 'red' : theme;

  // Helper to determine the bar's color based on its current health percentage
  const getBarColor = (bar: HealthBar) => {
    if (bar.colorMode === 'static') {
      return bar.staticColor;
    }
    const ratio = bar.maxValue > 0 ? bar.currentValue / bar.maxValue : 0;
    if (ratio <= 0.33) {
      return bar.gradientColors.low;
    } else if (ratio <= 0.66) {
      return bar.gradientColors.mid;
    } else {
      return bar.gradientColors.high;
    }
  };

  // RGB representation for shadows
  const rgbValues = 
    theme === 'emerald' ? '16,185,129' : 
    theme === 'sapphire' ? '59,130,246' : 
    theme === 'amber' ? '245,158,11' : 
    '239,68,68';

  return (
    <div className="min-h-screen bg-[#0c0d10] text-slate-100 flex flex-col p-6 md:p-12 relative overflow-hidden font-sans">
      
      {/* Immersive Background Orbs */}
      <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-${colorName}-500/5 rounded-full blur-[120px] pointer-events-none`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-${colorName}-950/10 rounded-full blur-[120px] pointer-events-none`} />
      <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-[#21242c]/25 rounded-full blur-[120px] pointer-events-none" />

      {/* Cinematic Header */}
      <div className="text-center mb-10 md:mb-14 relative z-10">
        <span className={`text-xs uppercase font-mono tracking-[0.25em] ${colors.text} font-bold mb-2 block`}>
          Fantasia • Campagna Attiva
        </span>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-wide text-slate-100 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          {title || "Senza Nome"}
        </h1>
        <div className={`w-24 h-1 bg-gradient-to-r from-transparent via-${colorName}-500/60 to-transparent mx-auto mt-4`} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 flex-grow max-w-7xl mx-auto w-full relative z-10 items-start">
        
        {/* Left Column: Participants List */}
        <div className="lg:col-span-4 space-y-6 bg-bento-panel border border-bento-border rounded-xl p-6 md:p-8">
          <div className="border-b border-bento-border pb-3 mb-4">
            <h2 className="text-lg font-display font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-2">
              <Shield className={`w-5 h-5 ${colors.text}`} />
              Partecipanti
            </h2>
            <p className="text-[11px] text-slate-500 mt-1 font-mono uppercase">Turno e Giocatori</p>
          </div>

          <div className="space-y-3">
            {players.length === 0 ? (
              <div className="text-center py-8 text-slate-600 italic text-sm">
                Nessun giocatore disponibile.
              </div>
            ) : (
              players.map((player, index) => {
                const isActive = player.id === state.activePlayerId;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between border rounded-xl px-4 py-3.5 transition-all ${
                      isActive
                        ? `bg-${colorName}-950/20 border-${colorName}-500/40 ring-1 ring-${colorName}-500/10 shadow-lg shadow-${colorName}-950/20`
                        : 'bg-[#0c0d10] border-bento-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full border font-mono text-xs flex items-center justify-center font-bold transition-colors ${
                        isActive
                          ? `bg-${colorName}-950/40 border-${colorName}-500 ${colors.textActive}`
                          : 'bg-bento-panel border-bento-border text-slate-400'
                      }`}>
                        {index + 1}
                      </span>
                      <span className={`font-display font-bold tracking-wide transition-colors ${
                        isActive ? colors.textActive : 'text-slate-200'
                      }`}>
                        {player.name}
                      </span>
                    </div>
                    {isActive && (
                      <span className={`text-[9px] font-mono font-bold tracking-widest ${colors.text} ${colors.glowBg} px-2 py-0.5 rounded-full flex items-center gap-1 uppercase animate-pulse`}>
                        <Star className={`w-2.5 h-2.5 ${colors.fill}`} /> Attivo
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Middle Column: Health Trackers */}
        <div className="lg:col-span-5 space-y-6 bg-bento-panel border border-bento-border rounded-xl p-6 md:p-8">
          <div className="border-b border-bento-border pb-3 mb-4">
            <h2 className="text-lg font-display font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-2">
              <Heart className={`w-5 h-5 ${colors.text}`} />
              Stato della Salute
            </h2>
            <p className="text-[11px] text-slate-500 mt-1 font-mono uppercase">Salute dei mostri e alleati</p>
          </div>

          <div className="space-y-5">
            {healthBars.length === 0 ? (
              <div className="text-center py-8 text-slate-600 italic text-sm">
                Nessun tracciatore di salute attivo.
              </div>
            ) : (
              healthBars.map((bar) => {
                const percentage = bar.maxValue > 0 ? (bar.currentValue / bar.maxValue) * 100 : 0;
                const activeColor = getBarColor(bar);
                
                // Segment calculations for visual rendering (non-interactive)
                const visualMax = bar.maxValue <= 40 ? bar.maxValue : 25;
                const segments = Array.from({ length: visualMax }, (_, i) => i + 1);

                return (
                  <div key={bar.id} className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <span className="font-display font-extrabold text-slate-200 text-sm md:text-base tracking-wide">
                        {bar.name}
                      </span>
                      {bar.currentValue === 0 ? (
                        <span className={`text-[9px] font-mono font-extrabold ${colors.text} ${colors.glowBg} px-2 py-0.5 rounded-full uppercase`}>
                          DEFUNTO
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-400">
                          <span className="font-bold text-slate-200 text-sm">{bar.currentValue}</span>
                          <span className="text-slate-600 mx-1">/</span>
                          <span>{bar.maxValue}</span>
                        </span>
                      )}
                    </div>

                    {/* Non-interactive Health Bar Segments */}
                    <div className="flex h-5 w-full rounded-md bg-[#1a1c23] overflow-hidden border border-bento-border gap-[2px] p-[1.5px] select-none">
                      {segments.map((segIndex) => {
                        let isSegmentActive = false;
                        if (bar.maxValue <= 40) {
                          isSegmentActive = segIndex <= bar.currentValue;
                        } else {
                          const fraction = segIndex / visualMax;
                          const segValue = Math.round(fraction * bar.maxValue);
                          isSegmentActive = bar.currentValue >= segValue;
                        }

                        return (
                          <div
                            key={segIndex}
                            className={`h-full flex-grow rounded-[1px] transition-all duration-300 ${
                              isSegmentActive ? 'opacity-100' : 'bg-slate-850/40'
                            }`}
                            style={{
                              backgroundColor: isSegmentActive ? activeColor : undefined,
                              boxShadow: isSegmentActive ? `0 0 3px ${activeColor}30` : 'none'
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Dice Roll Spotlight */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-bento-panel border border-bento-border rounded-xl p-6 md:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[300px]">
            {/* Spotlight decoration */}
            <div className={`absolute inset-0 bg-radial-gradient from-${colorName}-500/5 via-transparent to-transparent opacity-50 pointer-events-none`} />

            <div className="border-b border-bento-border pb-3 mb-6 w-full">
              <span className="text-xs uppercase font-mono tracking-widest text-slate-500">
                Ultimo Lancio
              </span>
            </div>

            {lastRoll ? (
              <div className="relative z-10 animate-fadeIn">
                <span className="text-slate-500 uppercase tracking-widest font-mono text-xs mb-1 block">
                  Dado {lastRoll.diceType}
                </span>
                
                <span className={`text-7xl md:text-8xl font-display font-black tracking-tighter text-white drop-shadow-[0_0_20px_rgba(${rgbValues},0.35)] block my-4`}>
                  {lastRoll.result}
                </span>

                {lastRoll.result === parseInt(lastRoll.diceType.substring(1)) && (
                  <div className={`${colors.text} bg-${colorName}-500/15 border border-${colorName}-500/30 font-semibold uppercase tracking-wider text-[10px] font-mono px-3 py-1 rounded-full inline-flex items-center gap-1.5 animate-pulse`}>
                    <Sparkles className="w-3.5 h-3.5" /> CRITICO!
                  </div>
                )}
                {lastRoll.result === 1 && (
                  <div className={`${colors.text} bg-${colorName}-500/15 border border-${colorName}-500/30 font-semibold uppercase tracking-wider text-[10px] font-mono px-3 py-1 rounded-full inline-flex items-center gap-1.5`}>
                    FALLIMENTO CRITICO!
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-600 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full border border-dashed border-bento-border flex items-center justify-center">
                  <span className="font-mono text-xs">d20</span>
                </div>
                <p className="text-xs italic leading-snug">In attesa del primo lancio del Master...</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
