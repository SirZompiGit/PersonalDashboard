import React, { useState, useEffect, useRef } from 'react';
import { CampaignState, Player, HealthBar, RollResult } from './types';
import { CampaignHeader } from './components/CampaignHeader';
import { DiceRoller } from './components/DiceRoller';
import { HealthBarsManager } from './components/HealthBarsManager';
import { PlayerCards } from './components/PlayerCards';
import { SharedView } from './components/SharedView';
import { 
  Download, 
  Upload, 
  Monitor, 
  EyeOff, 
  Dices, 
  Sparkles, 
  Sword, 
  FileJson,
  HelpCircle,
  Volume2,
  VolumeX,
  Settings,
  Palette,
  Wand2,
  ExternalLink
} from 'lucide-react';
import { setMuted } from './utils/audio';
import { CampaignTheme, getThemeColors } from './theme';

const LOCAL_STORAGE_KEY = 'dnd_campaign_master_state';

// Beautiful starting seed data to make the app look rich on first load
const DEFAULT_STATE: CampaignState = {
  title: 'Le Cronache di Elidon - Capitolo IV',
  players: [
    {
      id: 'p1',
      name: 'Kaelen l\'Elfo Silvano',
      inventory: [
        { id: 'i1', name: 'Arco Lungo del Vento' },
        { id: 'i2', name: 'Pozione di cura maggiore (x2)' },
        { id: 'i3', name: 'Rampino di ferro silvano' }
      ],
      bonus: [
        { id: 'b1', name: '+3 Iniziativa nelle foreste' },
        { id: 'b2', name: 'Scurovisione fino a 18 metri' }
      ]
    },
    {
      id: 'p2',
      name: 'Durnar il Barbaro Nano',
      inventory: [
        { id: 'i4', name: 'Ascia bipenne delle tempeste' },
        { id: 'i5', name: 'Amuleto del cuore di pietra' }
      ],
      bonus: [
        { id: 'b3', name: 'Immunità al veleno nanico' },
        { id: 'b4', name: 'Vantaggio sui tiri contro paura' }
      ]
    },
    {
      id: 'p3',
      name: 'Zephyr il Ladro Tiefling',
      inventory: [
        { id: 'i6', name: 'Pugnale dell\'ombra tagliente' },
        { id: 'i7', name: 'Attrezzi da scasso incantati' }
      ],
      bonus: [
        { id: 'b5', name: '+5 alle prove di Furtività' }
      ]
    }
  ],
  healthBars: [
    {
      id: 'h1',
      name: 'Drago Rosso Antico',
      currentValue: 62,
      maxValue: 100,
      colorMode: 'gradient',
      staticColor: '#ef4444',
      gradientColors: {
        low: '#dc2626',
        mid: '#f59e0b',
        high: '#10b981'
      }
    },
    {
      id: 'h2',
      name: 'Capo dei Goblin',
      currentValue: 12,
      maxValue: 25,
      colorMode: 'static',
      staticColor: '#ef4444',
      gradientColors: {
        low: '#ef4444',
        mid: '#ef4444',
        high: '#ef4444'
      }
    },
    {
      id: 'h3',
      name: 'Alleato: Chierico PNG',
      currentValue: 30,
      maxValue: 30,
      colorMode: 'gradient',
      staticColor: '#10b981',
      gradientColors: {
        low: '#dc2626',
        mid: '#ef4444',
        high: '#10b981'
      }
    }
  ],
  notes: 'Sotto le rovine di Elidon, il gruppo ha infine risvegliato il Drago Rosso Antico.\n\nNote di gioco:\n- Il drago lancia soffio di fuoco ogni 3 turni.\n- Zephyr ha posizionato una trappola vicino alla colonna est.\n- PNG Chierico cura il barbaro se scende sotto i 15 HP.',
  lastRoll: null,
  selectedDice: 'd20',
  activePlayerId: null,
  theme: 'crimson'
};

export default function App() {
  const [state, setState] = useState<CampaignState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Basic schema check to prevent crashes
        if (parsed && typeof parsed === 'object' && 'title' in parsed) {
          return parsed as CampaignState;
        }
      }
    } catch (e) {
      console.error('Error loading state from localStorage:', e);
    }
    return DEFAULT_STATE;
  });

  const [isSharedMode, setIsSharedMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if we are in shared URL mode (?shared=true)
  const [isUrlShared, setIsUrlShared] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('shared') === 'true') {
        setIsUrlShared(true);
      }
    }
  }, []);

  // Sync state between tabs in real-time
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Storage event listener (works across tabs in the same browser)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setState((current) => {
            // Check if contents are identical to avoid infinite update loops
            if (JSON.stringify(current) === JSON.stringify(parsed)) {
              return current;
            }
            return parsed;
          });
        } catch (err) {
          console.error(err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // 2. BroadcastChannel (highly responsive, works across tabs)
    const channel = new BroadcastChannel('fantasia_campaign_channel');
    channel.onmessage = (event) => {
      if (event.data && typeof event.data === 'object' && event.data.title) {
        setState((current) => {
          // Check if contents are identical to avoid infinite update loops
          if (JSON.stringify(current) === JSON.stringify(event.data)) {
            return current;
          }
          return event.data;
        });
      }
    };

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      channel.close();
    };
  }, []);

  const theme = state.theme || 'crimson';
  const colors = getThemeColors(theme);
  const colorName = theme === 'sapphire' ? 'blue' : theme === 'crimson' ? 'red' : theme;
  const setTheme = (newTheme: CampaignTheme) => {
    setState((prev) => ({ ...prev, theme: newTheme }));
  };

  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('fantasia_muted');
    return saved === 'true';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('fantasia_muted', isMuted ? 'true' : 'false');
    setMuted(isMuted);
  }, [isMuted]);

  // Autosave and broadcast to other tabs whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      
      // Broadcast state to other tabs (SharedView)
      const channel = new BroadcastChannel('fantasia_campaign_channel');
      channel.postMessage(state);
      channel.close();
    } catch (e) {
      console.error('Error saving or broadcasting state:', e);
    }
  }, [state]);

  // Campaign Header Handlers
  const handleTitleChange = (newTitle: string) => {
    setState((prev) => ({ ...prev, title: newTitle }));
  };

  const handleAddPlayer = (name: string) => {
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name,
      inventory: [],
      bonus: []
    };
    setState((prev) => ({
      ...prev,
      players: [...prev.players, newPlayer]
    }));
  };

  const handleRemovePlayer = (id: string) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== id)
    }));
  };

  const handleReorderPlayers = (startIndex: number, endIndex: number) => {
    setState((prev) => {
      const updated = [...prev.players];
      const [removed] = updated.splice(startIndex, 1);
      updated.splice(endIndex, 0, removed);
      return { ...prev, players: updated };
    });
  };

  // Dice Roller Handlers
  const handleRoll = (diceType: string, result: number) => {
    setState((prev) => ({
      ...prev,
      lastRoll: {
        diceType,
        result,
        timestamp: Date.now()
      }
    }));
  };

  const handleSelectedDiceChange = (dice: string) => {
    setState((prev) => ({ ...prev, selectedDice: dice }));
  };

  // Health Bars Handlers
  const handleAddHealthBar = (newBar: Omit<HealthBar, 'id'>) => {
    const bar: HealthBar = {
      ...newBar,
      id: crypto.randomUUID()
    };
    setState((prev) => ({
      ...prev,
      healthBars: [...prev.healthBars, bar]
    }));
  };

  const handleUpdateHealthBar = (id: string, updatedFields: Partial<HealthBar>) => {
    setState((prev) => ({
      ...prev,
      healthBars: prev.healthBars.map((bar) =>
        bar.id === id ? { ...bar, ...updatedFields } : bar
      )
    }));
  };

  const handleDeleteHealthBar = (id: string) => {
    setState((prev) => ({
      ...prev,
      healthBars: prev.healthBars.filter((bar) => bar.id !== id)
    }));
  };

  // Individual Player Handlers (Inventory & Bonuses)
  const handleUpdatePlayer = (id: string, updatedFields: Partial<Player>) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === id ? { ...p, ...updatedFields } : p))
    }));
  };

  // Notes Handler
  const handleNotesChange = (text: string) => {
    setState((prev) => ({ ...prev, notes: text }));
  };

  // JSON Import & Export functions
  const handleExportState = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      // Clean Campaign name for file naming
      const cleanCampName = state.title.toLowerCase().replace(/[^a-z0-9]/gi, '_').substring(0, 20);
      downloadAnchor.setAttribute('download', `dnd_sessione_${cleanCampName || 'campagna'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Error exporting campaign state', err);
    }
  };

  const handleImportState = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Basic verification of shape
        if (parsed && typeof parsed === 'object' && 'title' in parsed && 'players' in parsed) {
          setState(parsed as CampaignState);
          alert('Campagna caricata con successo!');
        } else {
          alert('Errore: Il formato del file JSON non è valido per questa campagna.');
        }
      } catch (err) {
        console.error('Error importing file:', err);
        alert('Impossibile importare il file. Assicurati che sia un file JSON di campagna valido.');
      }
    };
    reader.readAsText(file);
    // Reset file input value so same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Entirely render the Shared view if we are on the dedicated player URL
  if (isUrlShared) {
    return <SharedView state={state} />;
  }

  // Entirely render the Shared view if screen-share mode is toggled on
  if (isSharedMode) {
    return (
      <div className="relative">
        {/* Floating Toggle Banner on Shared view so DM can easily exit */}
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <button
            onClick={() => setIsSharedMode(false)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900/90 hover:bg-slate-800 text-amber-400 font-semibold text-xs uppercase tracking-wider rounded-full border border-slate-800 shadow-xl backdrop-blur-md cursor-pointer transition-all hover:scale-105 active:scale-95"
            title="Torna alla visualizzazione di controllo del Master"
          >
            <EyeOff className="w-3.5 h-3.5 text-amber-500" />
            Chiudi Schermo Condiviso
          </button>
        </div>
        <SharedView state={state} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-bento-bg text-slate-100 p-4 md:p-8 flex flex-col font-sans selection:bg-${colorName}-600/30 selection:text-${colorName}-200`}>
      
      {/* Immersive background decoration */}
      <div className={`absolute top-0 left-0 right-0 h-[500px] bg-gradient-radial from-${colorName}-600/5 to-transparent pointer-events-none z-0`} />
      
      {/* DM Top Banner Bar */}
      <header className={`max-w-7xl mx-auto w-full mb-8 relative ${isSettingsOpen ? 'z-30' : 'z-20'} flex flex-col lg:flex-row items-center justify-between gap-4 border-b border-bento-border pb-5`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-bento-panel border border-bento-border flex items-center justify-center shadow-lg shadow-black/40 shrink-0">
            <Wand2 className={`w-5 h-5 ${colors.text} stroke-[2]`} />
          </div>
          <div>
            <h2 className="text-lg font-display font-extrabold text-slate-100 tracking-wider flex items-center gap-1.5 uppercase">
              Fantasia <span className={`font-sans text-xs lowercase px-2 py-0.5 rounded-full ${colors.badge} font-bold`}>Dashboard</span>
            </h2>
          </div>
        </div>

        {/* Dashboard Tools */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* File input invisible */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportState}
            accept=".json"
            className="hidden"
          />

          {/* Import Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-bento-panel hover:bg-bento-button text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-bento-border"
            title="Importa stato campagna da file JSON"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            Importa JSON
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportState}
            className="px-3.5 py-2 bg-bento-panel hover:bg-bento-button text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-bento-border"
            title="Esporta stato campagna in un file JSON scaricabile"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Esporta JSON
          </button>

          {/* Open Shared Screen in New Window */}
          <button
            onClick={() => {
              window.open(`${window.location.origin}${window.location.pathname}?shared=true`, '_blank');
            }}
            className="px-3.5 py-2 bg-bento-panel hover:bg-bento-button text-slate-300 border border-bento-border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Apri lo Schermo Condiviso in una finestra separata per i giocatori (ideale per un secondo monitor o proiettore)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            Schermo Giocatori (Nuova Tab)
          </button>

          {/* Shared View Trigger in-page */}
          <button
            onClick={() => setIsSharedMode(true)}
            className={`px-4 py-2 ${colors.bg} hover:${colors.hoverBg} text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg ${colors.shadow} active:scale-[0.98] border ${colors.border}`}
            title="Attiva Schermo Condiviso pulito in questa finestra"
          >
            <Monitor className="w-3.5 h-3.5 stroke-[2]" />
            Anteprima Condivisione
          </button>

          {/* Settings / Impostazioni Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-2 py-2 bg-bento-panel hover:bg-bento-button text-slate-300 border border-bento-border rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer h-full ${
                isSettingsOpen ? `text-slate-100 ring-2 ring-${colorName}-500/20` : ''
              }`}
              title="Apri Impostazioni della Campagna"
            >
              <Settings className={`w-4 h-4 ${isSettingsOpen ? 'animate-spin-slow' : ''}`} />
            </button>

            {isSettingsOpen && (
              <>
                {/* Backdrop cover to click away */}
                <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
                
                {/* Popover Card */}
                <div className="absolute right-0 mt-2 w-72 bg-[#0c0d10] border border-bento-border rounded-xl p-4 shadow-2xl z-50 animate-fadeIn space-y-4 text-left">
                  <div className="border-b border-bento-border pb-2 flex items-center justify-between">
                    <span className="text-xs uppercase font-mono font-bold tracking-widest text-slate-300">
                      Impostazioni
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">v2.0</span>
                  </div>

                  {/* Theme selection */}
                  <div className="space-y-2">
                    <span className={`text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5`}>
                      <Palette className={`w-3.5 h-3.5 ${colors.text}`} /> Tema Interfaccia
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['crimson', 'emerald', 'sapphire', 'amber'] as CampaignTheme[]).map((t) => {
                        const labelMap: Record<CampaignTheme, string> = {
                          crimson: 'Vampiro',
                          emerald: 'Druido',
                          sapphire: 'Mago',
                          amber: 'Oste',
                        };
                        const colorMap: Record<CampaignTheme, string> = {
                          crimson: 'bg-red-500',
                          emerald: 'bg-emerald-500',
                          sapphire: 'bg-blue-500',
                          amber: 'bg-amber-500',
                        };
                        const activeBorderMap: Record<CampaignTheme, string> = {
                          crimson: 'border-red-500/50',
                          emerald: 'border-emerald-500/50',
                          sapphire: 'border-blue-500/50',
                          amber: 'border-amber-500/50',
                        };
                        const isActive = theme === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTheme(t)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-tight transition-all cursor-pointer flex items-center gap-1.5 border ${
                              isActive
                                ? `bg-[#1a1c23] ${activeBorderMap[t]} text-slate-100 font-bold shadow-md`
                                : 'bg-bento-panel/40 text-slate-500 hover:text-slate-300 border-transparent'
                            }`}
                            title={`Cambia tema in ${labelMap[t]}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${colorMap[t]} shrink-0`} />
                            <span className="truncate">{labelMap[t]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sound effects toggle */}
                  <div className="space-y-2 pt-2 border-t border-bento-border flex items-center justify-between gap-4">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                      Effetti Sonori
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsMuted(!isMuted)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                        isMuted
                          ? 'bg-red-950/20 border-red-500/30 text-red-500 hover:bg-red-950/30'
                          : 'bg-green-950/10 border-green-500/20 text-green-500 hover:bg-green-950/20'
                      }`}
                      title={isMuted ? "Attiva audio" : "Muta audio"}
                    >
                      {isMuted ? (
                        <>
                          <VolumeX className="w-4 h-4" /> Muto
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" /> Attivo
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="max-w-7xl mx-auto w-full flex-grow space-y-6 relative z-10">
        
        {/* Campaign title and Initiative */}
        <CampaignHeader
          title={state.title}
          onTitleChange={handleTitleChange}
          players={state.players}
          onAddPlayer={handleAddPlayer}
          onRemovePlayer={handleRemovePlayer}
          onReorderPlayers={handleReorderPlayers}
          notes={state.notes}
          onNotesChange={handleNotesChange}
          activePlayerId={state.activePlayerId}
          onSetActivePlayer={(id) => setState((prev) => ({ ...prev, activePlayerId: id }))}
          theme={theme}
          setTheme={setTheme}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
        />

        {/* Mid grid: Dice Roller & Health Tracker & Master Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Health Bars Tracker (col-span-8) */}
          <div className="lg:col-span-7">
            <HealthBarsManager
              healthBars={state.healthBars}
              onAddHealthBar={handleAddHealthBar}
              onUpdateHealthBar={handleUpdateHealthBar}
              onDeleteHealthBar={handleDeleteHealthBar}
            />
          </div>

          {/* Dice Roller (col-span-5) */}
          <div className="lg:col-span-5 flex">
            <div className="w-full h-full">
              <DiceRoller
                onRoll={handleRoll}
                lastRoll={state.lastRoll}
                selectedDice={state.selectedDice}
                onSelectedDiceChange={handleSelectedDiceChange}
                theme={theme}
              />
            </div>
          </div>

        </div>

        {/* Bottom player cards grids */}
        <div className="pt-4">
          <PlayerCards
            players={state.players}
            onUpdatePlayer={handleUpdatePlayer}
            activePlayerId={state.activePlayerId}
            theme={theme}
          />
        </div>

      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full mt-12 pt-6 border-t border-bento-border text-center text-xs text-slate-600 relative z-10">
        <p className="font-mono">Fantasia Dashboard v2.0 • Realizzata con cura e precisione per Sessioni di Gioco di Ruolo</p>
      </footer>
    </div>
  );
}
