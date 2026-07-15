import React, { useState, useEffect, useRef } from 'react';
import { HealthBar, GradientColors } from '../types';
import { Plus, Trash2, Edit2, ShieldAlert, Heart, Check, X, Sparkles, Folder, Settings2 } from 'lucide-react';
import { playDamageSound, playHealSound } from '../utils/audio';

interface HealthBarsManagerProps {
  healthBars: HealthBar[];
  healthGroups: string[];
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
  onAddHealthBar,
  onUpdateHealthBar,
  onDeleteHealthBar,
  onAddGroup,
  onRenameGroup,
  onDeleteGroup,
}) => {
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

  // Health Bar Card Sub-renderer
  const renderHealthBarCard = (bar: HealthBar) => {
    const percentage = bar.maxValue > 0 ? (bar.currentValue / bar.maxValue) * 100 : 0;
    const activeColor = getBarColor(bar);

    // Generate list of segments
    const segments = [];
    const visualMax = bar.maxValue <= 40 ? bar.maxValue : 25;
    
    for (let i = 1; i <= visualMax; i++) {
      segments.push(i);
    }

    return (
      <div 
        key={bar.id} 
        className="bg-[#0c0d10] border border-bento-border rounded-xl p-4 hover:border-slate-600 transition-all relative group"
      >
        {/* Edit/Delete overlay */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => startEdit(bar)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-[#21242c] rounded-lg transition-colors cursor-pointer"
            title="Modifica Barra"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteHealthBar(bar.id)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-[#21242c] rounded-lg transition-colors cursor-pointer"
            title="Elimina Barra"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bar Header */}
        <div className="flex justify-between items-center mb-2.5 pr-14">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-slate-200 tracking-wide text-sm md:text-base">
              {bar.name}
            </span>
            {bar.currentValue === 0 && (
              <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> DEFUNTO
              </span>
            )}
          </div>
          <div className="font-mono text-xs text-slate-400">
            <span className="font-bold text-slate-100 text-sm">{bar.currentValue}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span>{bar.maxValue}</span>
            <span className="text-slate-500 ml-1.5">({Math.round(percentage)}%)</span>
          </div>
        </div>

        {/* Segmented health track */}
        <div className="relative">
          <div 
            className="flex h-7 w-full rounded-lg bg-[#1a1c23] overflow-hidden border border-bento-border gap-[2px] p-[2px] select-none cursor-pointer"
            onMouseDown={() => {
              setIsMouseDown(true);
              activeBarIdRef.current = bar.id;
            }}
          >
            {segments.map((segIndex) => {
              let isSegmentActive = false;
              let segValue = segIndex;

              if (bar.maxValue <= 40) {
                isSegmentActive = segIndex <= bar.currentValue;
              } else {
                const fraction = segIndex / visualMax;
                segValue = Math.round(fraction * bar.maxValue);
                isSegmentActive = bar.currentValue >= segValue;
              }

              return (
                <div
                  key={segIndex}
                  className={`h-full flex-grow rounded-[2px] transition-all duration-150 ${
                    isSegmentActive 
                      ? 'opacity-100 hover:brightness-110' 
                      : 'bg-slate-850/40 hover:bg-slate-800'
                  }`}
                  style={{
                    backgroundColor: isSegmentActive ? activeColor : undefined,
                    boxShadow: isSegmentActive ? `0 0 4px ${activeColor}50` : 'none'
                  }}
                  onClick={() => handleSegmentInteraction(bar, segValue)}
                  onMouseEnter={() => {
                    if (isMouseDown && activeBarIdRef.current === bar.id) {
                      handleSegmentInteraction(bar, segValue);
                    }
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Quick adjustments bar below */}
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSegmentInteraction(bar, bar.currentValue - 1)}
              className="px-2 py-0.5 bg-bento-button hover:bg-[#2d3139] text-slate-300 rounded font-mono text-xs font-bold transition-all cursor-pointer border border-bento-border"
            >
              -1 HP
            </button>
            <button
              type="button"
              onClick={() => handleSegmentInteraction(bar, bar.currentValue - 5)}
              className="px-2 py-0.5 bg-bento-button hover:bg-[#2d3139] text-slate-400 rounded font-mono text-xs transition-all cursor-pointer border border-bento-border"
            >
              -5
            </button>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSegmentInteraction(bar, bar.currentValue + 5)}
              className="px-2 py-0.5 bg-bento-button hover:bg-[#2d3139] text-slate-400 rounded font-mono text-xs transition-all cursor-pointer border border-bento-border"
            >
              +5
            </button>
            <button
              type="button"
              onClick={() => handleSegmentInteraction(bar, bar.currentValue + 1)}
              className="px-2 py-0.5 bg-bento-button hover:bg-[#2d3139] text-slate-300 rounded font-mono text-xs font-bold transition-all cursor-pointer border border-bento-border"
            >
              +1 HP
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-bento-panel border border-bento-border rounded-xl p-6 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h2 className="text-base font-semibold uppercase tracking-wider font-display text-slate-200 flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500 animate-pulse" />
          Barre della Vita
        </h2>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsManagingGroups(!isManagingGroups)}
            className={`px-2.5 py-1.5 bg-[#0c0d10] hover:bg-bento-button text-slate-300 border border-bento-border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isManagingGroups ? 'ring-1 ring-red-500/40 text-red-400 border-red-500/30' : ''
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
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-red-950/25 border border-red-500"
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 font-mono flex items-center gap-1.5">
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
              className="bg-bento-panel border border-bento-border focus:border-red-500/50 text-slate-100 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500/30 flex-grow"
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
              className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
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
                      <span className="text-[11px] text-red-400 font-semibold font-sans">Eliminare il gruppo "{g}"?</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteGroup(g);
                            setDeletingGroupName(null);
                          }}
                          className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-white text-[10px] font-bold cursor-pointer transition-colors"
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
                        className="bg-bento-panel border border-bento-border focus:border-red-500/50 text-slate-100 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500/30 flex-grow"
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
                          className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-bento-panel transition-colors cursor-pointer"
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
                          className="text-slate-500 hover:text-red-500 p-1 rounded hover:bg-bento-panel transition-colors cursor-pointer"
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 font-mono">
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
                className="w-full bg-bento-panel border border-bento-border focus:border-red-500/50 text-slate-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500/30"
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
                className="w-full bg-bento-panel border border-bento-border focus:border-red-500/50 text-slate-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500/30 font-sans"
              >
                <option value="">Nessun Gruppo (Senza Gruppo)</option>
                {healthGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
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
                  className="w-full bg-bento-panel border border-bento-border focus:border-red-500/50 text-slate-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500/30 font-mono"
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
                  className="w-full bg-bento-panel border border-bento-border focus:border-red-500/50 text-slate-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500/30 font-mono"
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
                  className="accent-red-600"
                />
                Colore Singolo Statico
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="radio"
                  checked={colorMode === 'gradient'}
                  onChange={() => setColorMode('gradient')}
                  className="accent-red-600"
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
                  <span className="text-[10px] text-red-500 font-semibold block">Basso livello (≤ 33%)</span>
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
                  <span className="text-[10px] text-red-400 font-semibold block">Medio livello (34-66%)</span>
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
              className="px-4 py-2 bg-red-600 hover:bg-red-500 border border-red-500 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
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
                    {groupBars.map((bar) => renderHealthBarCard(bar))}
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
                  {ungroupedBars.map((bar) => renderHealthBarCard(bar))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
