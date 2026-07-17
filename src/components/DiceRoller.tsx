import React, { useState, useEffect } from 'react';
import { RollResult } from '../types';
import { Sparkles, RotateCcw, Edit2, Trash2, Plus, Check, X, Tag, Eye, EyeOff } from 'lucide-react';
import { playRollSound, playCritSuccessSound, playCritFailSound } from '../utils/audio';
import { CampaignTheme, getThemeColors } from '../theme';

interface DiceRollerProps {
  onRoll: (diceType: string, result: number, label?: string) => void;
  lastRoll: RollResult | null;
  rollHistory?: RollResult[];
  isRollHidden?: boolean;
  onToggleRollVisibility?: () => void;
  onClearHistory?: () => void;
  selectedDice: string;
  onSelectedDiceChange: (dice: string) => void;
  theme?: CampaignTheme;
  hideHistory?: boolean;
  diceLabels?: string[];
  onAddDiceLabel?: (label: string) => void;
  onRenameDiceLabel?: (oldLabel: string, newLabel: string) => void;
  onDeleteDiceLabel?: (label: string) => void;
}

export const DiceRoller: React.FC<DiceRollerProps> = ({
  onRoll,
  lastRoll,
  rollHistory = [],
  isRollHidden = false,
  onToggleRollVisibility,
  onClearHistory,
  selectedDice,
  onSelectedDiceChange,
  hideHistory = false,
  theme = 'crimson',
  diceLabels = ['Tiro salvezza', 'Tiro attacco', 'Prova di abilità', 'Percezione', 'Danno'],
  onAddDiceLabel,
  onRenameDiceLabel,
  onDeleteDiceLabel,
}) => {
  const diceTypes = ['d3', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20'];
  const [isRolling, setIsRolling] = useState(false);
  const [tempNumber, setTempNumber] = useState<number | null>(null);
  const [triggerShake, setTriggerShake] = useState(false);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);

  // Roll Labels states
  const [selectedLabel, setSelectedLabel] = useState('');
  const [isManagingLabels, setIsManagingLabels] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [editingLabelName, setEditingLabelName] = useState<string | null>(null);
  const [tempLabelName, setTempLabelName] = useState('');
  const [deletingLabelName, setDeletingLabelName] = useState<string | null>(null);

  const colors = getThemeColors(theme as CampaignTheme);
  const colorName = theme === 'sapphire' ? 'blue' : theme === 'crimson' ? 'red' : theme;

  const rollDice = () => {
    if (isRolling) return;

    setIsRolling(true);
    setTriggerShake(false);
    setSparkles([]);
    
    // Play dice rolling sound
    playRollSound();
    
    const sides = parseInt(selectedDice.substring(1));
    
    // Fast numbers animation
    let counter = 0;
    const interval = setInterval(() => {
      setTempNumber(Math.floor(Math.random() * sides) + 1);
      counter++;
      if (counter > 8) {
        clearInterval(interval);
        const finalResult = Math.floor(Math.random() * sides) + 1;
        setTempNumber(finalResult);
        setIsRolling(false);
        onRoll(selectedDice, finalResult, selectedLabel || undefined);

        // Handle Audio & Visual Effects based on outcomes
        if (finalResult === sides) {
          // Critical Success!
          playCritSuccessSound();
          
          // Generate 16 sparkle particles with random paths
          const newSparkles = Array.from({ length: 16 }).map((_, i) => {
            const angle = (i / 16) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
            const distance = 50 + Math.random() * 120;
            return {
              id: Math.random() + i,
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance - 30, // shift up slightly
            };
          });
          setSparkles(newSparkles);
        } else if (finalResult === 1) {
          // Critical Failure!
          playCritFailSound();
          setTriggerShake(true);
          setTimeout(() => setTriggerShake(false), 500);
        }
      }
    }, 60);
  };

  // Convert theme name to hexadecimal color representation for particles
  const particleColorHex = 
    theme === 'emerald' ? '#10b981' : 
    theme === 'sapphire' ? '#3b82f6' : 
    theme === 'amber' ? '#f59e0b' : 
    '#ef4444';

  // RGB representation for drop-shadows
  const rgbValues = 
    theme === 'emerald' ? '16,185,129' : 
    theme === 'sapphire' ? '59,130,246' : 
    theme === 'amber' ? '245,158,11' : 
    '239,68,68';

  return (
    <div className={`bg-bento-panel border border-bento-border rounded-xl p-6 shadow-xl flex flex-col h-full relative overflow-hidden transition-all duration-300 ${
      triggerShake ? `shake-animation ${colors.border} ${colors.shadow}` : ''
    }`}>
      {/* Decorative top grid */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent`} />

      <h2 className="text-sm font-semibold uppercase tracking-wider font-display text-slate-200 mb-4 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${colors.bg} animate-pulse`} />
        Lancio dei Dadi
      </h2>

      {/* Dice Selector Chips */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-4">
        {diceTypes.map((dice) => {
          const isSelected = selectedDice === dice;
          return (
            <button
              key={dice}
              type="button"
              onClick={() => onSelectedDiceChange(dice)}
              disabled={isRolling}
              className={`py-2 px-3 sm:px-4 text-center font-mono font-bold text-sm rounded-lg border transition-all cursor-pointer flex-1 min-w-[3rem] ${
                isSelected
                  ? `${colors.bg} text-white ${colors.border} shadow-md ${colors.shadow}`
                  : 'bg-[#0c0d10] text-slate-400 border-bento-border hover:text-slate-200 hover:border-slate-500'
              }`}
            >
              {dice}
            </button>
          );
        })}
      </div>

      {/* Dice Roll Label Selector dropdown */}
      <div className="mb-4 space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            Associa Etichetta
          </label>
          {(onAddDiceLabel || onRenameDiceLabel || onDeleteDiceLabel) && (
            <button
              type="button"
              onClick={() => setIsManagingLabels(!isManagingLabels)}
              className={`text-[10px] font-semibold text-slate-500 hover:${colors.textActive} transition-colors cursor-pointer ${
                isManagingLabels ? '${colors.textActive} underline' : ''
              }`}
            >
              Gestisci Etichette
            </button>
          )}
        </div>
        
        <select
          value={selectedLabel}
          onChange={(e) => setSelectedLabel(e.target.value)}
          disabled={isRolling}
          className={`w-full bg-[#0c0d10] border border-bento-border text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:${colors.ring} cursor-pointer`}
        >
          <option value="">Nessuna Etichetta</option>
          {diceLabels.map((lbl) => (
            <option key={lbl} value={lbl}>{lbl}</option>
          ))}
        </select>
      </div>

      {/* Label Management Sub-Panel */}
      {isManagingLabels && (
        <div className="bg-[#0c0d10] border border-bento-border rounded-xl p-3.5 mb-4 space-y-3 animate-fadeIn text-left">
          <div className="flex items-center justify-between border-b border-bento-border pb-1.5">
            <span className={`text-[10px] uppercase font-mono font-bold ${colors.text}`}>Gestisci Etichette</span>
            <button
              type="button"
              onClick={() => { setIsManagingLabels(false); setEditingLabelName(null); }}
              className="text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Add Label Row */}
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Nuova etichetta..."
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              className={`bg-bento-panel border border-bento-border focus:${colors.border}/50 text-slate-100 text-xs rounded px-2.5 py-1.5 focus:outline-none flex-grow`}
              maxLength={24}
            />
            <button
              type="button"
              onClick={() => {
                if (newLabelName.trim() && onAddDiceLabel) {
                  onAddDiceLabel(newLabelName.trim());
                  setNewLabelName('');
                }
              }}
              className={`px-3 py-1.5 ${colors.bg} ${colors.hoverBg} text-white rounded text-xs font-semibold cursor-pointer`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List of custom Labels */}
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {diceLabels.map((lbl) => (
              <div key={lbl} className="flex items-center justify-between px-2.5 py-1.5 bg-bento-panel/30 border border-bento-border rounded text-xs">
                {deletingLabelName === lbl ? (
                  <div className="flex items-center justify-between flex-grow animate-fadeIn">
                    <span className={`text-[10px] ${colors.textActive} font-semibold`}>Eliminare "{lbl}"?</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteDiceLabel?.(lbl);
                          setDeletingLabelName(null);
                        }}
                        className={`px-1.5 py-0.5 ${colors.bg} ${colors.hoverBg} rounded text-white text-[9px] font-bold cursor-pointer transition-colors`}
                      >
                        Sì
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingLabelName(null)}
                        className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 text-[9px] font-bold cursor-pointer transition-colors"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : editingLabelName === lbl ? (
                  <div className="flex items-center gap-1 flex-grow">
                    <input
                      type="text"
                      value={tempLabelName}
                      onChange={(e) => setTempLabelName(e.target.value)}
                      className="bg-bento-panel border border-bento-border text-slate-100 text-[11px] rounded px-1.5 py-0.5 focus:outline-none flex-grow"
                      maxLength={24}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (tempLabelName.trim() && tempLabelName.trim() !== lbl && onRenameDiceLabel) {
                          onRenameDiceLabel(lbl, tempLabelName.trim());
                        }
                        setEditingLabelName(null);
                      }}
                      className="p-1 bg-green-600 hover:bg-green-500 rounded text-white cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingLabelName(null)}
                      className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-slate-300 font-medium">{lbl}</span>
                    {(onRenameDiceLabel || onDeleteDiceLabel) && (
                    <div className="flex items-center gap-1.5">
                      {onRenameDiceLabel && <button
                        type="button"
                        onClick={() => {
                          setEditingLabelName(lbl);
                          setTempLabelName(lbl);
                          setDeletingLabelName(null);
                        }}
                        className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>}
                      {onDeleteDiceLabel && <button
                        type="button"
                        onClick={() => {
                          setDeletingLabelName(lbl);
                          setEditingLabelName(null);
                        }}
                        className={`text-slate-500 hover:${colors.text} p-0.5 rounded transition-colors cursor-pointer`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>}
                    </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Core Roll Display Screen */}
      <div className="flex-grow flex flex-col items-center justify-center bg-[#0c0d10] border border-bento-border rounded-xl p-6 mb-5 relative min-h-[140px]">
        {/* Toggle Roll Visibility Button */}
        {onToggleRollVisibility && lastRoll && !isRolling && (
          <button
            type="button"
            onClick={onToggleRollVisibility}
            className={`absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer ${isRollHidden ? 'text-amber-500 hover:text-amber-400' : ''}`}
            title={isRollHidden ? "Mostra lancio" : "Nascondi lancio"}
          >
            {isRollHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        
        {/* Background glow when rolling or showing result */}
        {isRolling && (
          <div className={`absolute inset-0 ${colors.bg}/5 blur-xl animate-pulse rounded-xl`} />
        )}

        {/* Dynamic floating sparkles for critical successes */}
        {sparkles.map((s) => (
          <div
            key={s.id}
            className={`absolute w-2 h-2 rounded-full ${colors.textActive} sparkle-particle pointer-events-none z-20`}
            style={{
              left: '50%',
              top: '50%',
              '--tw-x': `${s.x}px`,
              '--tw-y': `${s.y}px`,
              boxShadow: `0 0 8px ${particleColorHex}, 0 0 3px #fef08a`,
            } as React.CSSProperties}
          />
        ))}

        {isRolling ? (
          <div className="flex flex-col items-center">
            <span className={`text-6xl font-display font-extrabold ${colors.text}/90 tracking-tighter filter blur-[1px] animate-pulse`}>
              {tempNumber ?? '?'}
            </span>
            <span className={`text-xs ${colors.text}/60 font-mono mt-3 uppercase tracking-widest animate-pulse`}>
              Rotolando...
            </span>
          </div>
        ) : lastRoll ? (
          <div className="flex flex-col items-center text-center relative group">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-1 flex items-center justify-center gap-1.5 flex-wrap">
              Risultato {lastRoll.diceType} 
              {lastRoll.label && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-900 border border-bento-border text-slate-400 rounded">
                  {lastRoll.label}
                </span>
              )}
            </span>
            <span className={`text-6xl font-display font-extrabold text-white tracking-tighter dice-animation drop-shadow-[0_0_15px_rgba(${rgbValues},0.2)] ${isRollHidden ? 'opacity-30 blur-[2px]' : ''}`}>
              {lastRoll.result}
            </span>
            {lastRoll.result === parseInt(lastRoll.diceType.substring(1)) && (
              <span className={`text-xs font-semibold ${colors.text} flex items-center gap-1 mt-2 ${colors.glowBg} px-2 py-0.5 rounded-full`}>
                <Sparkles className="w-3 h-3" /> CRITICO!
              </span>
            )}
            {lastRoll.result === 1 && (
              <span className={`text-xs font-semibold ${colors.text} flex items-center gap-1 mt-2 ${colors.glowBg} px-2 py-0.5 rounded-full`}>
                FALLIMENTO!
              </span>
            )}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-slate-500 text-sm font-light">Seleziona un dado e premi Lancia</p>
          </div>
        )}
      </div>

      {/* Roll Action Button */}
      <button
        type="button"
        onClick={rollDice}
        disabled={isRolling}
        className={`w-full py-3 ${colors.bg} hover:${colors.hoverBg} border ${colors.border} text-white font-display font-bold rounded-xl shadow-lg ${colors.shadow} active:scale-[0.98] transition-all cursor-pointer text-base uppercase tracking-wider disabled:opacity-50`}
      >
        {isRolling ? 'Lancio...' : `Lancia ${selectedDice}`}
      </button>

      {/* History of Rolls */}
      {!hideHistory && (
      <div className="mt-6 border-t border-bento-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-display">
            Storico Lanci
          </span>
          {rollHistory.length > 0 && onClearHistory && (
            <button
              type="button"
              onClick={onClearHistory}
              className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
              title="Svuota Storico"
            >
              <RotateCcw className="w-3 h-3" />
              Svuota
            </button>
          )}
        </div>

        {(!rollHistory || rollHistory.length <= 1) ? (
          <p className="text-xs text-slate-600 italic">Nessun lancio registrato in questa sessione.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 pr-1 scrollbar-thin">
            {rollHistory.slice(1).map((roll, idx) => (
              <div
                key={roll.timestamp + idx}
                className="bg-[#0c0d10] border border-bento-border rounded-lg py-1 px-3 flex flex-col items-center min-w-[65px] relative group"
              >
                <span className="text-[10px] text-slate-500 font-mono font-bold">
                  {roll.diceType}
                </span>
                <span className={`text-base font-display font-bold ${
                  roll.result === parseInt(roll.diceType.substring(1))
                    ? colors.textActive
                    : roll.result === 1
                    ? colors.text
                    : 'text-slate-200'
                }`}>
                  {roll.result}
                </span>
                {roll.label && (
                  <span 
                    className="text-[8px] font-mono uppercase text-slate-500 truncate max-w-[55px] text-center" 
                    title={roll.label}
                  >
                    {roll.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
};
