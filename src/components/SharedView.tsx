import React, { useState, useEffect, useRef } from 'react';
import { CampaignState, Player, HealthBar } from '../types';
import { Shield, Sparkles, BookOpen, Heart, Star } from 'lucide-react';
import { CampaignTheme, getThemeColors } from '../theme';
import { HealthBarItem } from './HealthBarItem';
import { playRollSound, playCritSuccessSound, playCritFailSound } from '../utils/audio';

interface SharedViewProps {
  state: CampaignState;
}

export const SharedView: React.FC<SharedViewProps> = ({ state }) => {
  const { title, players, healthBars, lastRoll, theme = 'crimson' } = state;
  const colors = getThemeColors(theme);
  const colorName = theme === 'sapphire' ? 'blue' : theme === 'crimson' ? 'red' : theme;
  const healthGroups = state.healthGroups || ['Nemici', 'Alleati', 'PG'];
  
  const [triggerShake, setTriggerShake] = useState(false);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const prevRollTimestampRef = useRef<number | null>(null);

  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dummy ref for HealthBarItem readOnly mode
  const dummyRef = useRef<string | null>(null);

  useEffect(() => {
    const updateScale = () => {
      // Virtual resolution: 1280x800
      const targetW = 1280;
      const targetH = 800;
      const windowW = window.innerWidth;
      const windowH = window.innerHeight;
      const scaleW = windowW / targetW;
      const scaleH = windowH / targetH;
      // Fit to screen entirely
      setScale(Math.min(scaleW, scaleH));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    if (lastRoll && lastRoll.timestamp !== prevRollTimestampRef.current) {
      if (prevRollTimestampRef.current !== null) {
        setTriggerShake(true);
        playRollSound();
        setTimeout(() => setTriggerShake(false), 300);

        if (lastRoll.result === parseInt(lastRoll.diceType.substring(1))) {
          playCritSuccessSound();
          const newSparkles = Array.from({ length: 15 }).map((_, i) => ({
            id: Date.now() + i,
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200 - 50,
          }));
          setSparkles(newSparkles);
          setTimeout(() => setSparkles([]), 1500);
        } else if (lastRoll.result === 1) {
          playCritFailSound();
        }
      }
      prevRollTimestampRef.current = lastRoll.timestamp;
    }
  }, [lastRoll]);

  const getBarColor = (bar: HealthBar) => {
    if (bar.colorMode === 'static') return bar.staticColor;
    const ratio = bar.maxValue > 0 ? bar.currentValue / bar.maxValue : 0;
    if (ratio <= 0.33) return bar.gradientColors.low;
    if (ratio <= 0.66) return bar.gradientColors.mid;
    return bar.gradientColors.high;
  };

  const renderHealthBarItem = (bar: HealthBar) => (
    <HealthBarItem
      key={bar.id}
      bar={bar}
      onEdit={() => {}}
      onDelete={() => {}}
      getBarColor={getBarColor}
      isMouseDown={false}
      activeBarIdRef={dummyRef}
      setIsMouseDown={() => {}}
      handleSegmentInteraction={() => {}}
      readOnly={true}
    />
  );

  const barsByGroup: Record<string, HealthBar[]> = {};
  const ungroupedBars: HealthBar[] = [];

  healthBars.forEach((bar) => {
    if (bar.group && healthGroups.includes(bar.group)) {
      if (!barsByGroup[bar.group]) barsByGroup[bar.group] = [];
      barsByGroup[bar.group].push(bar);
    } else {
      ungroupedBars.push(bar);
    }
  });

  const rgbValues = 
    theme === 'emerald' ? '16,185,129' : 
    theme === 'sapphire' ? '59,130,246' : 
    theme === 'amber' ? '245,158,11' : '239,68,68';

  return (
    <div className="w-screen h-screen bg-[#0c0d10] text-slate-100 flex items-center justify-center overflow-hidden relative font-sans">
      <style>{`
        @keyframes diceParticleFloatShared {
          0% { transform: translate(calc(-50% + var(--ox)), calc(-50% + var(--oy))) scale(0.5); opacity: 0; }
          20% { transform: translate(calc(-50% + var(--ox) * 1.2), calc(-50% + var(--oy) * 1.2)) scale(1.5); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--ox) * 2), calc(-50% + var(--oy) * 2)) scale(0.5); opacity: 0; }
        }
        @keyframes sharedDiceShake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-4px, 4px) rotate(-5deg); }
          50% { transform: translate(4px, -4px) rotate(5deg); }
          75% { transform: translate(-4px, -4px) rotate(-5deg); }
        }
      `}</style>
      
      {/* Immersive Background Orbs */}
      <div className={`fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-${colorName}-500/5 rounded-full blur-[120px] pointer-events-none z-0`} />
      <div className={`fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-${colorName}-950/10 rounded-full blur-[120px] pointer-events-none z-0`} />
      
      {/* Scaled Virtual Container */}
      <div 
        ref={containerRef}
        className="flex flex-col relative z-10"
        style={{ 
          width: 1280, 
          height: 800, 
          transform: `scale(${scale})`, 
          transformOrigin: 'center center' 
        }}
      >
        {/* Cinematic Header */}
        <div className="text-center mb-6 shrink-0">
          <h1 className="text-4xl font-display font-black tracking-tighter text-white uppercase mb-2">
            {title}
          </h1>
          <div className={`w-32 h-1 bg-${colorName}-500 mx-auto rounded-full opacity-80`} />
        </div>

        <div className="flex-1 flex flex-col min-h-0 gap-6">
          <div className={state.campaignNotes && state.campaignNotes.trim().length > 0 
            ? "grid grid-cols-12 gap-6 h-[calc(100%-11.5rem)] shrink-0" 
            : "grid grid-cols-12 gap-6 flex-1 min-h-0"}>
            {/* Left Column: Turn Tracker (4 cols) */}
            <div className="col-span-4 bg-bento-panel border border-bento-border rounded-xl p-5 md:p-6 shadow-lg h-full flex flex-col overflow-hidden">
              <div className="border-b border-bento-border pb-3 mb-4 shrink-0 flex items-center justify-between">
                <h2 className="text-base font-display font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-2">
                  <Shield className={`w-5 h-5 ${colors.text}`} /> Ordine di Turno
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 pr-2">
                {players.length === 0 ? (
                  <div className="text-center py-8 text-slate-600 italic text-sm">Nessun giocatore nell'iniziativa.</div>
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
                            isActive ? `bg-${colorName}-950/40 border-${colorName}-500 ${colors.textActive}` : 'bg-bento-panel border-bento-border text-slate-400'
                          }`}>
                            {index + 1}
                          </span>
                          <span className={`font-display font-bold text-base tracking-wide transition-colors ${
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

            {/* Middle Column: Health Bars (5 cols) */}
            <div className="col-span-5 bg-bento-panel border border-bento-border rounded-xl p-5 md:p-6 shadow-lg h-full flex flex-col overflow-hidden">
              <div className="border-b border-bento-border pb-3 mb-4 shrink-0 flex items-center justify-between">
                <h2 className="text-base font-display font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-2">
                  <Heart className={`w-5 h-5 ${colors.text}`} /> Stato della Salute
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6 pr-2">
                {healthBars.length === 0 ? (
                  <div className="text-center py-8 text-slate-600 italic text-sm">Nessun tracciatore di salute.</div>
                ) : (
                  <>
                    {healthGroups.map((groupName) => {
                      const groupBars = barsByGroup[groupName] || [];
                      if (groupBars.length === 0) return null;
                      return (
                        <div key={groupName} className="space-y-3">
                          <div className="flex items-center gap-2 border-b border-bento-border/30 pb-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold bg-[#0c0d10] px-1.5 py-0.5 rounded border border-bento-border/40">
                              {groupName}
                            </span>
                          </div>
                          <div className="space-y-3">
                            {groupBars.map((bar) => renderHealthBarItem(bar))}
                          </div>
                        </div>
                      );
                    })}
                    {ungroupedBars.length > 0 && (
                      <div className="space-y-3 mt-6">
                        <div className="flex items-center gap-2 border-b border-bento-border/30 pb-1">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold bg-[#0c0d10] px-1.5 py-0.5 rounded border border-bento-border/40">
                            Senza Gruppo
                          </span>
                        </div>
                        <div className="space-y-3">
                          {ungroupedBars.map((bar) => renderHealthBarItem(bar))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Dice Roll (3 cols) */}
            <div className="col-span-3 bg-bento-panel border border-bento-border rounded-xl p-5 md:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden h-full shadow-lg">
              <div className={`absolute inset-0 bg-radial-gradient from-${colorName}-500/5 via-transparent to-transparent opacity-50 pointer-events-none`} />
              
              <div className="border-b border-bento-border pb-3 mb-6 w-full">
                <span className="text-xs uppercase font-mono tracking-widest text-slate-500">Ultimo Lancio</span>
              </div>
              
              {lastRoll ? (
                <div 
                  className="relative z-10 transition-transform duration-100"
                  style={{ animation: triggerShake ? 'sharedDiceShake 0.3s ease-in-out' : 'none' }}
                >
                  <span className="text-slate-500 uppercase tracking-widest font-mono text-xs mb-1 block">
                    Dado {lastRoll.diceType}
                  </span>
                  
                  {lastRoll.label && (
                    <span className="inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 bg-[#0c0d10] border border-bento-border text-slate-300 rounded uppercase tracking-wider">
                      {lastRoll.label}
                    </span>
                  )}
                  
                  <div className="relative">
                    <span className={`text-7xl font-display font-black tracking-tighter text-white drop-shadow-[0_0_20px_rgba(${rgbValues},0.35)] block my-6`}>
                      {lastRoll.result}
                    </span>

                    {sparkles.map(p => (
                      <div
                        key={p.id}
                        className="absolute top-1/2 left-1/2 z-50 pointer-events-none"
                        style={{
                          '--ox': `${p.x}px`,
                          '--oy': `${p.y}px`,
                          color: colors.text,
                          animation: 'diceParticleFloatShared 1.5s ease-out forwards'
                        } as React.CSSProperties}
                      >
                        <Sparkles className="w-6 h-6 opacity-80" />
                      </div>
                    ))}
                  </div>

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
                  <p className="text-xs italic leading-snug px-4">In attesa del primo lancio...</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Area: Campaign Notes */}
          {state.campaignNotes && state.campaignNotes.trim().length > 0 && (
            <div className="bg-bento-panel border border-bento-border rounded-xl p-5 md:p-6 shadow-lg flex flex-col shrink-0 h-40 min-h-[10rem] max-h-[80vh] resize-y overflow-hidden relative">
              <div className="border-b border-bento-border pb-3 mb-4 shrink-0">
                <h2 className="text-base font-display font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-2">
                  <BookOpen className={`w-5 h-5 ${colors.text}`} /> Appunti della Campagna
                </h2>
              </div>
              <div className="flex-1 w-full bg-[#0c0d10] border border-bento-border text-slate-200 text-sm rounded-lg p-4 leading-relaxed font-sans shadow-inner overflow-y-auto whitespace-pre-wrap break-words scrollbar-hide">
                {state.campaignNotes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
