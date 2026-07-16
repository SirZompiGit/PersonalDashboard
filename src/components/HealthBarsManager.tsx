import React, { useState, useEffect, useRef } from 'react';
import { HealthBar, GradientColors } from '../types';
import { Plus, Trash2, Edit2, ShieldAlert, Heart, Check, X, Sparkles, Folder, Settings2 } from 'lucide-react';
import { playDamageSound, playHealSound } from '../utils/audio';
import { HealthBarItem } from './HealthBarItem';
import { CampaignTheme, getThemeColors } from '../theme';

interface HealthBarsManagerProps {
  healthBars: HealthBar[];
  healthGroups: string[];
  theme?: CampaignTheme;
  onAddHealthBar: (healthBar: Omit<HealthBar, 'id'>) => void;
  onUpdateHealthBar: (id: string, updated: Partial<HealthBar>) => void;
  onDeleteHealthBar: (id: string) => void;
  onAddGroup: (group: string) => void;
  onRenameGroup: (oldName: string, newName: string) => void;
  onDeleteGroup: (group: string) => void;
}

const PRESET_COLORS = [
  { name: 'Smeraldo', hex: '#10b981' },
  { name: 'Cremisi', hex: '#ef4444' },
  { name: 'Ambra', hex: '#f59e0b' },
  { name: 'Zaffiro', hex: '#3b82f6' },
  { name: 'Ametista', hex: '#a855f7' },
  { name: 'Oceano', hex: '#06b6d4' },
];

export const HealthBarsManager: React.FC<HealthBarsManagerProps> = ({
  healthBars,
  healthGroups,
  theme = 'crimson',
  onAddHealthBar,
  onUpdateHealthBar,
  onDeleteHealthBar,
  onAddGroup,
  onRenameGroup,
  onDeleteGroup,
}) => {
  const colorName = theme === 'sapphire' ? 'blue' : theme === 'crimson' ? 'red' : theme;
  const colors = getThemeColors(theme as CampaignTheme);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [maxValue, setMaxValue] = useState(20);
  const [currentValue, setCurrentValue] = useState(20);
  const [colorMode, setColorMode] = useState<'static' | 'gradient'>('static');
  const [staticColor, setStaticColor] = useState('#10b981');
  const [lowColor, setLowColor] = useState('#ef4444');
  const [midColor, setMidColor] = useState('#f59e0b');
  const [highColor, setHighColor] = useState('#10b981');
  const [group, setGroup] = useState('');
  const [zeroHpText, setZeroHpText] = useState('DEFUNTO');

  // Group management states
  const [isManagingGroups, setIsManagingGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [tempGroupName, setTempGroupName] = useState('');
  const [deletingGroupName, setDeletingGroupName] = useState<string | null>(null);

  // Mouse drag tracking
  const [isMouseDown, setIsMouseDown] = useState(false);
  const activeBarIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsMouseDown(false);
      activeBarIdRef.current = null;
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const resetForm = () => {
    setName('');
    setMaxValue(20);
    setCurrentValue(20);
    setColorMode('static');
    setStaticColor('#10b981');
    setLowColor('#ef4444');
    setMidColor('#f59e0b');
    setHighColor('#10b981');
    setGroup('');
    setZeroHpText('DEFUNTO');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddHealthBar({
      name: name.trim(),
      maxValue,
      currentValue: Math.min(currentValue, maxValue),
      colorMode,
      staticColor,
      gradientColors: {
        low: lowColor,
        mid: midColor,
        high: highColor,
      },
      group: group || undefined,
      zeroHpText: zeroHpText.trim() || 'DEFUNTO',
    });

    resetForm();
    setIsAdding(false);
  };

  const startEdit = (bar: HealthBar) => {
    setEditingId(bar.id);
    setName(bar.name);
    setMaxValue(bar.maxValue);
    setCurrentValue(bar.currentValue);
    setColorMode(bar.colorMode);
    setStaticColor(bar.staticColor);
    setLowColor(bar.gradientColors.low);
    setMidColor(bar.gradientColors.mid);
    setHighColor(bar.gradientColors.high);
    setGroup(bar.group || '');
    setZeroHpText(bar.zeroHpText || 'DEFUNTO');
  };

  const handleUpdate = () => {
    if (!name.trim() || !editingId) return;

    onUpdateHealthBar(editingId, {
      name: name.trim(),
      maxValue,
      currentValue: Math.min(currentValue, maxValue),
      colorMode,
      staticColor,
      gradientColors: {
        low: lowColor,
        mid: midColor,
        high: highColor,
      },
      group: group || undefined,
      zeroHpText: zeroHpText.trim() || 'DEFUNTO',
    });

    setEditingId(null);
    resetForm();
  };

  // Helper to determine active color of a bar based on its current health percentage
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

  // Click & drag handlers for segments
  const handleSegmentInteraction = (bar: HealthBar, value: number) => {
    const clamped = Math.max(0, Math.min(value, bar.maxValue));
    if (clamped > bar.currentValue) {
      playHealSound();
    } else if (clamped < bar.currentValue) {
      playDamageSound();
    }
    onUpdateHealthBar(bar.id, { currentValue: clamped });
  };

  // Categorize health bars by group
  const barsByGroup: Record<string, HealthBar[]> = {};
  const ungroupedBars: HealthBar[] = [];

  healthBars.forEach((bar) => {
    if (bar.group && healthGroups.includes(bar.group)) {
      if (!barsByGroup[bar.group]) {
        barsByGroup[bar.group] = [];
      }
      barsByGroup[bar.group].push(bar);
    } else {
      ungroupedBars.push(bar);
    }
  });


  return (
    <div className="bg-bento-panel border border-bento-border rounded-xl p-6 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h2 className={`text-base font-semibold uppercase tracking-wider font-display ${colors.text} flex items-center gap-2`}>
          <Heart className={`w-5 h-5 ${colors.text} animate-pulse`} />
          Barre della Vita
        </h2>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsManagingGroups(!isManagingGroups)}
            className={`px-2.5 py-1.5 bg-[#0c0d10] hover:bg-bento-button text-slate-300 border border-bento-border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isManagingGroups ? 'ring-1 ${colors.ring} ${colors.textActive} ${colors.border}/30' : ''
            }`}
            title="Gestisci i gruppi di barre vita"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Gruppi
          </button>

          {!isAdding && !editingId && (
            <button
              type="button"
              onClick={() => { resetForm(); setIsAdding(true); }}
              className={`px-3 py-1.5 ${colors.text} hover:${colors.textActive} bg-bento-panel border border-bento-border hover:border-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-md`}
            >
              <Plus className="w-3.5 h-3.5" />
              Nuova Barra
            </button>
          )}
        </div>
      </div>

      {/* Group Management Panel */}
      {isManagingGroups && (
        <div className="bg-[#0c0d10] border border-bento-border rounded-xl p-4 mb-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-bento-border pb-2">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${colors.text} font-mono flex items-center gap-1.5`}>
              <Folder className="w-3.5 h-3.5" /> Gestione Gruppi
            </h3>
            <button
              type="button"
              onClick={() => { setIsManagingGroups(false); setEditingGroupName(null); }}
              className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nome nuovo gruppo..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className={`bg-bento-panel border border-bento-border focus:${colors.border}/50 text-slate-100 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:${colors.ring} flex-grow`}
              maxLength={20}
            />
            <button
              type="button"
              onClick={() => {
                if (newGroupName.trim()) {
                  onAddGroup(newGroupName.trim());
                  setNewGroupName('');
                }
              }}
              className={`px-3 py-2 ${colors.bg} ${colors.hoverBg} text-white rounded-lg text-xs font-semibold transition-all cursor-pointer`}
            >
              Aggiungi
            </button>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {healthGroups.length === 0 ? (
              <p className="text-[11px] text-slate-600 italic text-center py-2">Nessun gruppo personalizzato creato.</p>
            ) : (
              healthGroups.map((g) => (
                <div key={g} className="flex items-center justify-between px-3 py-2 bg-bento-panel/30 border border-bento-border rounded-lg text-xs">
                  {deletingGroupName === g ? (
                    <div className="flex items-center justify-between flex-grow animate-fadeIn">
                      <span className={`text-[11px] ${colors.textActive} font-semibold font-sans`}>Eliminare il gruppo "{g}"?</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteGroup(g);
                            setDeletingGroupName(null);
                          }}
                          className={`px-2 py-1 ${colors.bg} ${colors.hoverBg} rounded text-white text-[10px] font-bold cursor-pointer transition-colors`}
                        >
                          Sì
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingGroupName(null)}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : editingGroupName === g ? (
                    <div className="flex items-center gap-1.5 flex-grow">
                      <input
                        type="text"
                        value={tempGroupName}
                        onChange={(e) => setTempGroupName(e.target.value)}
                        className={`bg-bento-panel border border-bento-border focus:${colors.border}/50 text-slate-100 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:${colors.ring} flex-grow`}
                        maxLength={20}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (tempGroupName.trim() && tempGroupName.trim() !== g) {
                            onRenameGroup(g, tempGroupName.trim());
                          }
                          setEditingGroupName(null);
                        }}
                        className="p-1 bg-green-600 hover:bg-green-500 rounded text-white cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingGroupName(null)}
                        className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-slate-200">{g}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGroupName(g);
                            setTempGroupName(g);
                            setDeletingGroupName(null);
                          }}
                          className={`text-slate-400 hover:${colors.textActive} p-1 rounded hover:bg-bento-panel transition-colors cursor-pointer`}
                          title="Rinomina"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingGroupName(g);
                            setEditingGroupName(null);
                          }}
                          className={`text-slate-500 hover:${colors.text} p-1 rounded hover:bg-bento-panel transition-colors cursor-pointer`}
                          title="Elimina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Creation / Editing Panel */}
      {(isAdding || editingId) && (
        <form onSubmit={editingId ? (e) => { e.preventDefault(); handleUpdate(); } : handleCreate} 
              className="bg-[#0c0d10] border border-bento-border rounded-xl p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between border-b border-bento-border pb-2">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${colors.text} font-mono`}>
              {editingId ? 'Modifica Barra Vita' : 'Crea Nuova Barra Vita'}
            </h3>
            <button
              type="button"
              onClick={() => { setIsAdding(false); setEditingId(null); resetForm(); }}
              className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name Input */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Nome (es. Goblin, Boss, Guerriero)</label>
              <input
                type="text"
                placeholder="Nome bersaglio..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full bg-bento-panel border border-bento-border focus:${colors.border}/50 text-slate-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:${colors.ring}`}
                maxLength={30}
                required
              />
            </div>

            {/* Group Selection */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Gruppo</label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className={`w-full bg-bento-panel border border-bento-border focus:${colors.border}/50 text-slate-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:${colors.ring} font-sans`}
              >
                <option value="">Nessun Gruppo (Senza Gruppo)</option>
                {healthGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Zero HP Text */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs text-slate-400 font-medium">Testo a 0 HP (es. DEFUNTO)</label>
              <input
                type="text"
                placeholder="DEFUNTO"
                value={zeroHpText}
                onChange={(e) => setZeroHpText(e.target.value)}
                className={`w-full bg-bento-panel border border-bento-border focus:${colors.border}/50 text-slate-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:${colors.ring} uppercase font-mono tracking-wider`}
                maxLength={20}
              />
            </div>

            {/* Max & Current Values */}
            <div className="grid grid-cols-2 gap-3 md:col-span-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Valore Massimo</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={maxValue}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setMaxValue(val);
                    if (currentValue > val) setCurrentValue(val);
                  }}
                  className={`w-full bg-bento-panel border border-bento-border focus:${colors.border}/50 text-slate-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:${colors.ring} font-mono`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Valore Attuale</label>
                <input
                  type="number"
                  min={0}
                  max={maxValue}
                  value={currentValue}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setCurrentValue(Math.min(val, maxValue));
                  }}
                  className={`w-full bg-bento-panel border border-bento-border focus:${colors.border}/50 text-slate-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:${colors.ring} font-mono`}
                />
              </div>
            </div>
          </div>

          {/* Color Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium block">Modalità Colore</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="radio"
                  checked={colorMode === 'static'}
                  onChange={() => setColorMode('static')}
                  className="accent-slate-500"
                />
                Colore Singolo Statico
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="radio"
                  checked={colorMode === 'gradient'}
                  onChange={() => setColorMode('gradient')}
                  className="accent-slate-500"
                />
                Sfocatura / Gradiente a 3 livelli (Alto/Medio/Basso)
              </label>
            </div>
          </div>

          {/* Color Choosers */}
          {colorMode === 'static' ? (
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium block">Scegli Colore Statico</label>
              <div className="flex flex-wrap gap-2 items-center">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setStaticColor(preset.hex)}
                    style={{ backgroundColor: preset.hex }}
                    className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                      staticColor === preset.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                    }`}
                    title={preset.name}
                  />
                ))}
                <div className="flex items-center gap-1.5 ml-2 border border-bento-border px-2 py-1 rounded-lg bg-bento-panel">
                  <span className="text-[10px] text-slate-400 font-mono">Custom:</span>
                  <input
                    type="color"
                    value={staticColor}
                    onChange={(e) => setStaticColor(e.target.value)}
                    className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-bento-panel rounded-lg border border-bento-border space-y-3">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">Colori della salute</span>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className={`text-[10px] ${colors.text} font-semibold block`}>Basso livello (≤ 33%)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={lowColor}
                      onChange={(e) => setLowColor(e.target.value)}
                      className="w-7 h-7 rounded bg-transparent border border-bento-border cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-400">{lowColor}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className={`text-[10px] ${colors.textActive} font-semibold block`}>Medio livello (34-66%)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={midColor}
                      onChange={(e) => setMidColor(e.target.value)}
                      className="w-7 h-7 rounded bg-transparent border border-bento-border cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-400">{midColor}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-emerald-500 font-semibold block">Alto livello (≥ 67%)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={highColor}
                      onChange={(e) => setHighColor(e.target.value)}
                      className="w-7 h-7 rounded bg-transparent border border-bento-border cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-400">{highColor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-bento-border">
            <button
              type="button"
              onClick={() => { setIsAdding(false); setEditingId(null); resetForm(); }}
              className="px-4 py-2 bg-bento-button hover:bg-[#2d3139] border border-bento-border text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              className={`px-4 py-2 ${colors.bg} ${colors.hoverBg} border ${colors.border} text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer`}
            >
              {editingId ? 'Aggiorna Barra' : 'Crea Barra'}
            </button>
          </div>
        </form>
      )}

      {/* Rendered Health Bars List Grouped */}
      <div className="space-y-6">
        {healthBars.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-[#0c0d10] border border-dashed border-bento-border rounded-2xl text-sm italic">
            Nessuna barra vita creata. Crea una barra vita per tracciare la salute dei mostri o degli alleati!
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Loop through custom groups */}
            {healthGroups.map((groupName) => {
              const groupBars = barsByGroup[groupName] || [];
              if (groupBars.length === 0) return null;

              return (
                <div key={groupName} className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-bento-border/30 pb-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold bg-[#0c0d10] px-2 py-0.5 rounded border border-bento-border/40">
                      {groupName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">({groupBars.length})</span>
                  </div>
                  <div className="space-y-3">
                    {groupBars.map((bar) => (<HealthBarItem 
        key={bar.id}
        bar={bar} 
        onEdit={startEdit} 
        onDelete={onDeleteHealthBar} 
        getBarColor={getBarColor} 
        isMouseDown={isMouseDown} 
        activeBarIdRef={activeBarIdRef} 
        setIsMouseDown={setIsMouseDown} 
        handleSegmentInteraction={handleSegmentInteraction} 
    />))}
                  </div>
                </div>
              );
            })}

            {/* 2. Loop through ungrouped bars */}
            {ungroupedBars.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-bento-border/30 pb-1">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold bg-[#0c0d10] px-2 py-0.5 rounded border border-bento-border/40">
                    Senza Gruppo
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">({ungroupedBars.length})</span>
                </div>
                <div className="space-y-3">
                  {ungroupedBars.map((bar) => (<HealthBarItem 
        key={bar.id}
        bar={bar} 
        onEdit={startEdit} 
        onDelete={onDeleteHealthBar} 
        getBarColor={getBarColor} 
        isMouseDown={isMouseDown} 
        activeBarIdRef={activeBarIdRef} 
        setIsMouseDown={setIsMouseDown} 
        handleSegmentInteraction={handleSegmentInteraction} 
    />))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
