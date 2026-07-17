import React, { useState, useEffect, useRef } from 'react';
import { CampaignState, Player, HealthBar } from '../types';
import { RoomUser } from '../firebaseUtils';
import { Shield, Sparkles, BookOpen, Heart, Star, GripHorizontal, GripVertical, Maximize2, X, Dices } from 'lucide-react';
import { CampaignTheme, getThemeColors } from '../theme';
import { HealthBarItem } from './HealthBarItem';
import { playRollSound, playCritSuccessSound, playCritFailSound } from '../utils/audio';

import { RollResult } from '../types';

interface SharedViewProps {
  state: CampaignState;
  participantRolls?: RollResult[];
  roomUsers?: Record<string, RoomUser>;
  theme?: CampaignTheme;
  personalNotesSlot?: React.ReactNode;
  diceRollerSlot?: React.ReactNode;
  isLite?: boolean;
}

export const SharedView: React.FC<SharedViewProps> = ({ state, participantRolls = [], roomUsers, personalNotesSlot, diceRollerSlot, isLite }) => {
  const { title, players, healthBars, lastRoll, theme = 'crimson' } = state;
  const colors = getThemeColors(theme);
  const colorName = theme === 'sapphire' ? 'blue' : theme === 'crimson' ? 'red' : theme;
  const healthGroups = state.healthGroups || ['Nemici', 'Alleati', 'PG'];
  
  const [triggerShake, setTriggerShake] = useState(false);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const prevRollTimestampRef = useRef<number | null>(null);

  


  const [healthLayout, setHealthLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const containerRef = useRef<HTMLDivElement>(null);
  const dummyRef = useRef<string | null>(null);
  const [expandedNote, setExpandedNote] = useState<'campaign' | 'personal' | null>(null);

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
      layout={healthLayout}
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
    <div className="w-full h-full min-h-full bg-[#0c0d10] text-slate-100 overflow-auto relative font-sans flex flex-col items-center justify-center p-4 md:p-8">
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
      <div className={`fixed top-[-10%] left-[-10%] w-[50%] h-[50%] ${colors.glowBg} rounded-full blur-[120px] pointer-events-none z-0`} />
      <div className={`fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-900/50 rounded-full blur-[120px] pointer-events-none z-0`} />
      
      {/* Scaled Virtual Container */}
      <div 
        ref={containerRef}
        className="w-full max-w-[98%] xl:max-w-[1800px] min-w-[1200px] flex-1 bg-bento-panel border border-bento-border/50 rounded-2xl shadow-2xl flex flex-col p-6 xl:p-8 relative z-10 mx-auto my-2 min-h-0 overflow-hidden"
      >
        {/* Cinematic Header */}
        <div className="text-center mb-6 shrink-0">
          <h1 className="text-4xl font-display font-black tracking-tighter text-white uppercase mb-2">
            {title}
          </h1>
          <div className={`w-32 h-1 ${colors.bg} mx-auto rounded-full opacity-80`} />
        </div>

        <div className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-12 gap-6 items-stretch">
            {/* Left Column: Turn Tracker (4 cols) */}
            <div className="col-span-3 bg-bento-panel border border-bento-border rounded-xl p-5 md:p-6 shadow-lg h-full flex flex-col overflow-hidden min-h-0">
              <div className="border-b border-bento-border pb-3 mb-4 shrink-0 flex items-center justify-between">
                <h2 className="text-base font-display font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-2">
                  <Shield className={`w-5 h-5 ${colors.text}`} /> Ordine di Turno
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3 pr-2">
                {players.length === 0 ? (
                  <div className="text-center py-8 text-slate-600 italic text-sm">Nessun giocatore nell'iniziativa.</div>
                ) : (
                  players.map((player, index) => {
                    const isActive = player.id === state.activePlayerId;
                    return (
                      <div 
                        key={player.id} 
                        className={`flex flex-col border rounded-xl px-3 py-2.5 transition-all ${
                          isActive
                            ? `bg-slate-800 ${colors.border} ring-1 ${colors.ring} shadow-lg ${colors.shadow}`
                            : 'bg-[#0c0d10] border-bento-border'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <span className={`w-5 h-5 rounded-full border font-mono text-[10px] flex items-center justify-center font-bold transition-colors ${
                              isActive ? `${colors.glowBg} ${colors.border} ${colors.textActive}` : 'bg-bento-panel border-bento-border text-slate-400'
                            }`}>
                              {index + 1}
                            </span>
                            <span className={`font-display font-bold text-sm tracking-wide transition-colors ${
                              isActive ? colors.textActive : 'text-slate-200'
                            }`}>
                              {player.name}
                            </span>
                          </div>
                          {isActive && (
                            <span className={`text-[9px] font-mono font-bold tracking-widest ${colors.text} ${colors.glowBg} px-2 py-0.5 rounded-full flex items-center gap-1 uppercase animate-pulse shrink-0`}>
                              <Star className={`w-2.5 h-2.5 ${colors.fill}`} /> Attivo
                            </span>
                          )}
                        </div>
                        {isActive && (player.inventory.length > 0 || player.bonus.length > 0) && (
                          <div className="mt-4 pt-3 border-t border-bento-border/50 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            {player.inventory.length > 0 && (
                              <div>
                                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block mb-1.5">Inventario</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {player.inventory.map(item => (
                                    <span key={item.id} className="text-[11px] bg-[#1a1d23] border border-bento-border/60 px-2 py-1 rounded-md text-slate-300 font-medium leading-none">
                                      {item.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {player.bonus.length > 0 && (
                              <div>
                                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block mb-1.5">Bonus</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {player.bonus.map(item => (
                                    <span key={item.id} className="text-[11px] bg-[#1a1d23] border border-bento-border/60 px-2 py-1 rounded-md text-slate-300 font-medium leading-none">
                                      {item.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
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
                <button
                  type="button"
                  onClick={() => setHealthLayout(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
                  className="p-1.5 hover:bg-[#21242c] rounded-md transition-colors text-slate-400 hover:text-slate-200"
                  title={healthLayout === 'horizontal' ? 'Passa alla vista verticale' : 'Passa alla vista orizzontale'}
                >
                  {healthLayout === 'horizontal' ? <GripHorizontal className="w-5 h-5" /> : <GripVertical className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex-1 flex flex-col space-y-6 pr-2 overflow-y-auto scrollbar-hide">
                {healthBars.length === 0 ? (
                  <div className="text-center py-8 text-slate-600 italic text-sm">Nessun tracciatore di salute.</div>
                ) : (
                  <>
                    {healthGroups.map((groupName) => {
                      const groupBars = barsByGroup[groupName] || [];
                      if (groupBars.length === 0) return null;
                      return (
                        <div key={groupName} className="space-y-3 flex-1 flex flex-col min-h-0">
                          <div className="flex items-center gap-2 border-b border-bento-border/30 pb-1 shrink-0">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold bg-[#0c0d10] px-1.5 py-0.5 rounded border border-bento-border/40">
                              {groupName}
                            </span>
                          </div>
                          <div className={`gap-3 flex-1 min-h-0 ${healthLayout === 'vertical' ? 'flex flex-row overflow-x-auto pb-2 pt-2 scrollbar-thin' : 'flex flex-col space-y-3 overflow-y-auto'}`}>
                            {groupBars.map((bar) => renderHealthBarItem(bar))}
                          </div>
                        </div>
                      );
                    })}
                    {ungroupedBars.length > 0 && (
                      <div className="mt-6 flex flex-col space-y-3 flex-1 min-h-0">
                        {healthGroups.some(g => (barsByGroup[g] || []).length > 0) && (
                          <div className="flex items-center gap-2 border-b border-bento-border/30 pb-1 shrink-0">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold bg-[#0c0d10] px-1.5 py-0.5 rounded border border-bento-border/40">
                              Senza Gruppo
                            </span>
                          </div>
                        )}
                        <div className={`gap-3 flex-1 min-h-0 ${healthLayout === 'vertical' ? 'flex flex-row overflow-x-auto pb-2 pt-2 scrollbar-thin' : 'flex flex-col space-y-3 overflow-y-auto'}`}>
                          {ungroupedBars.map((bar) => renderHealthBarItem(bar))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

                        {/* Right Column: Dice Roll, Player Rolls, Schedule (4 cols) */}
            <div className="col-span-4 flex h-full min-h-0 gap-4">
              
              {/* Dice Roller & Master Roll Sub-Column */}
              <div className="flex flex-col gap-4 flex-[3] h-full min-h-0">
                {diceRollerSlot && (
                  <div className="bg-[#0c0d10] border border-bento-border rounded-xl flex flex-col shadow-lg shrink-0 overflow-hidden relative z-20 h-auto">
                    {diceRollerSlot}
                  </div>
                )}
                
                {/* Dice Roll Box */}
                <div className="bg-bento-panel border border-bento-border rounded-xl p-3 md:p-4 flex flex-col items-center justify-center text-center relative overflow-hidden flex-1 shadow-lg min-h-0">
                  <div className={`absolute inset-0 bg-radial-gradient ${colors.glow} via-transparent to-transparent opacity-50 pointer-events-none`} />
                  
                  <div className="border-b border-bento-border pb-2 mb-2 w-full">
                      <span className="text-xs uppercase font-mono tracking-widest text-slate-500">DADO MASTER</span>
                  </div>
                  
                  {lastRoll ? (
                    <div 
                      className="relative z-10 transition-transform duration-100 flex flex-col items-center flex-1 justify-center w-full"
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
                        <span className={`text-4xl lg:text-5xl font-display font-black tracking-tighter text-white drop-shadow-[0_0_20px_rgba(${rgbValues},0.35)] block my-2 ${state.isRollHidden ? 'opacity-30 blur-[2px]' : ''}`}>
                          {state.isRollHidden ? '?' : lastRoll.result}
                        </span>
                        {state.isRollHidden && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg lg:text-xl font-mono font-bold text-amber-500 uppercase tracking-widest bg-slate-900/80 px-3 py-1 rounded-lg border border-amber-500/30 rotate-12 drop-shadow-xl backdrop-blur-sm shadow-xl z-20">
                              Nascosto
                            </span>
                          </div>
                        )}
                        
                        {!state.isRollHidden && sparkles.map(p => (
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
                            <Sparkles className="w-5 h-5 opacity-80" />
                          </div>
                        ))}
                      </div>

                      {!state.isRollHidden && lastRoll.result === parseInt(lastRoll.diceType.substring(1)) && (
                        <div className={`${colors.text} ${colors.bg}/15 border ${colors.border}/30 font-semibold uppercase tracking-wider text-[10px] font-mono px-3 py-1 rounded-full inline-flex items-center gap-1.5 animate-pulse`}>
                          <Sparkles className="w-3.5 h-3.5" /> CRITICO!
                        </div>
                      )}
                      
                      {!state.isRollHidden && lastRoll.result === 1 && (
                        <div className={`${colors.text} ${colors.bg}/15 border ${colors.border}/30 font-semibold uppercase tracking-wider text-[10px] font-mono px-3 py-1 rounded-full inline-flex items-center gap-1.5`}>
                          FALLIMENTO CRITICO!
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-600 flex flex-col items-center gap-3 flex-1 justify-center">
                      <div className="w-12 h-12 rounded-full border border-dashed border-bento-border flex items-center justify-center">
                        <span className="font-mono text-xs">d20</span>
                      </div>
                      <p className="text-xs italic leading-snug px-4">In attesa del primo lancio...</p>
                    </div>
                  )}
                  {/* Roll History Mini-View DELETED FROM HERE AS REQUESTED */}
                </div>

                {/* Schedule Box */}
                {(state.scheduleDay || state.scheduleTime) && (
                  <div className="bg-bento-panel border border-bento-border rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-lg shrink-0">
                    <div className="flex items-center gap-3">
                      {state.scheduleDay && (
                        <span className={`text-sm font-display font-bold text-slate-200 capitalize`}>
                          {state.scheduleDay}
                        </span>
                      )}
                      {state.scheduleDay && state.scheduleTime && (
                        <span className={`text-slate-600 font-light`}>|</span>
                      )}
                      {state.scheduleTime && (
                        <span className={`text-sm font-mono font-bold ${colors.text}`}>
                          {state.scheduleTime}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Participant Rolls Sub-Column */}
              {!isLite && (
                <div className="bg-bento-panel border border-bento-border rounded-xl p-3 shadow-lg flex flex-col flex-[2] overflow-y-auto scrollbar-thin h-full min-w-[140px]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-display block mb-3 sticky top-0 bg-bento-panel z-10 pb-1 border-b border-bento-border/50">
                    Lanci dei Giocatori
                  </span>
                  <div className="flex flex-col gap-3">
                    {(!participantRolls || participantRolls.length === 0) ? (
                      <div className="text-slate-600 flex flex-col items-center gap-2 mt-4">
                        <span className="font-mono text-xs">Nessun lancio</span>
                      </div>
                    ) : (
                      participantRolls.slice().reverse().map((roll, idx) => {
                        let playerLabel = 'Sconosciuto';
                        let rollLabel = '';
                        const labelParts = roll.label ? roll.label.split('|') : [];
                        
                        if (labelParts.length >= 2) {
                           const rollerId = labelParts[0];
                           const rollUserName = labelParts[1];
                           rollLabel = labelParts.slice(2).join('|');
                           const roller = roomUsers ? Object.values(roomUsers).find(u => u.id === rollerId) : undefined;
                           
                           if (roller) {
                              const assignedPlayer = state.players.find(p => p.id === roller.assignedPlayerId);
                              playerLabel = assignedPlayer ? assignedPlayer.name : roller.name;
                           } else {
                              playerLabel = rollUserName;
                           }
                        } else if (labelParts.length === 1) {
                           rollLabel = labelParts[0];
                        }
                        
                        return (
                          <div key={roll.timestamp + idx} className="bg-[#0c0d10] border border-bento-border rounded-lg p-2 flex flex-col w-full relative overflow-hidden group shadow-md hover:border-slate-700 transition-colors">
                            <div className={`absolute inset-0 bg-radial-gradient ${colors.glow} opacity-0 group-hover:opacity-10 transition-opacity`} />
                            <div className="flex justify-between items-center mb-1 border-b border-bento-border pb-1 gap-1">
                              <span className="text-[10px] text-slate-300 font-mono truncate font-bold" title={playerLabel}>{playerLabel}</span>
                              <span className="text-[9px] text-slate-500 font-bold bg-slate-900 px-1 py-0.5 rounded">{roll.diceType}</span>
                            </div>
                            <div className="flex items-center justify-center py-1 relative">
                              <span className={`text-2xl font-display font-black drop-shadow-sm ${
                                roll.result === parseInt(roll.diceType.substring(1)) ? colors.textActive : roll.result === 1 ? colors.text : 'text-white'
                              }`}>
                                {roll.result}
                              </span>
                              {roll.result === parseInt(roll.diceType.substring(1)) && (
                                <Sparkles className={`w-3 h-3 absolute top-0 right-2 opacity-50 ${colors.textActive}`} />
                              )}
                            </div>
                            {rollLabel && (
                              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center truncate w-full block mt-1 bg-slate-800/50 rounded py-0.5 px-1" title={rollLabel}>
                                {rollLabel}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Bottom Area: Notes */}
          {((state.campaignNotes && state.campaignNotes.trim().length > 0) || personalNotesSlot) && (
            <div className="flex flex-col md:flex-row gap-4 shrink-0 h-48 min-h-[12rem] max-h-[80vh] relative">
              
              {state.campaignNotes && state.campaignNotes.trim().length > 0 && (
                <div className="bg-bento-panel border border-bento-border rounded-xl p-5 shadow-lg flex flex-col flex-[3] resize-y overflow-hidden relative">
                  <div className="border-b border-bento-border pb-3 mb-3 shrink-0 flex items-center justify-between">
                    <h2 className="text-sm font-display font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-2">
                      <BookOpen className={`w-4 h-4 ${colors.text}`} /> Appunti Campagna
                    </h2>
                    <button onClick={() => setExpandedNote('campaign')} className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 text-[10px] uppercase font-bold cursor-pointer"><Maximize2 className="w-3 h-3"/> Extend</button>
                  </div>
                  <div className="flex-1 w-full bg-[#0c0d10] border border-bento-border text-slate-200 text-sm rounded-lg p-3 leading-relaxed font-sans shadow-inner overflow-y-auto whitespace-pre-wrap break-words scrollbar-hide">
                    {state.campaignNotes}
                  </div>
                </div>
              )}

              {personalNotesSlot && (
                <div className="bg-bento-panel border border-bento-border rounded-xl p-5 shadow-lg flex flex-col flex-[2] resize-y overflow-hidden relative">
                  <div className="border-b border-bento-border pb-3 mb-3 shrink-0 flex items-center justify-between">
                    <h2 className="text-sm font-display font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-2">
                      <BookOpen className={`w-4 h-4 text-emerald-400`} /> Appunti Personali
                    </h2>
                    <button onClick={() => setExpandedNote('personal')} className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 text-[10px] uppercase font-bold cursor-pointer"><Maximize2 className="w-3 h-3"/> Extend</button>
                  </div>
                  <div className="flex-1 overflow-hidden flex flex-col">
                    {personalNotesSlot}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modals for Expanded Notes */}
          {expandedNote === 'campaign' && (
             <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-12 animate-fadeIn">
               <div className="bg-bento-panel border border-bento-border rounded-2xl w-full max-w-5xl h-full max-h-full flex flex-col shadow-2xl relative overflow-hidden">
                 <div className="bg-slate-900 border-b border-bento-border p-4 flex items-center justify-between shrink-0">
                    <h2 className="text-lg font-display font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-2">
                      <BookOpen className={`w-5 h-5 ${colors.text}`} /> Appunti Campagna
                    </h2>
                    <button onClick={() => setExpandedNote(null)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"><X className="w-5 h-5"/></button>
                 </div>
                 <div className="flex-1 bg-[#0c0d10] p-6 text-slate-200 text-base leading-relaxed font-sans overflow-y-auto whitespace-pre-wrap break-words">
                    {state.campaignNotes}
                 </div>
               </div>
             </div>
          )}

          {expandedNote === 'personal' && personalNotesSlot && (
             <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-12 animate-fadeIn">
               <div className="bg-bento-panel border border-bento-border rounded-2xl w-full max-w-5xl h-full max-h-full flex flex-col shadow-2xl relative overflow-hidden">
                 <div className="bg-slate-900 border-b border-bento-border p-4 flex items-center justify-between shrink-0">
                    <h2 className="text-lg font-display font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-2">
                      <BookOpen className={`w-5 h-5 text-emerald-400`} /> Appunti Personali
                    </h2>
                    <button onClick={() => setExpandedNote(null)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"><X className="w-5 h-5"/></button>
                 </div>
                 <div className="flex-1 bg-[#0c0d10] p-6 overflow-hidden flex flex-col">
                    {personalNotesSlot}
                 </div>
               </div>
             </div>
          )}
</div>
      </div>
    </div>
  );
};
