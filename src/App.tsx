import React, { useState, useEffect, useRef } from 'react';
import { CampaignState, Player, HealthBar, RollResult } from './types';
import { CampaignHeader } from './components/CampaignHeader';
import { DiceRoller } from './components/DiceRoller';
import { HealthBarsManager } from './components/HealthBarsManager';
import { PlayerCards } from './components/PlayerCards';
import { SharedView } from './components/SharedView';

import { db } from './firebase';
import { createRoom, updateRoomCampaign, joinRoom, subscribeToRoom, RoomState, RoomUser, updateUser, deleteRoom } from './firebaseUtils';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ParticipantView } from './components/ParticipantView';


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
  ExternalLink,
  Trash2
} from 'lucide-react';
import { setMuted } from './utils/audio';
import { CampaignTheme, getThemeColors } from './theme';

const LOCAL_STORAGE_KEY = 'fantasia_campaign_master_state';

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
      },
      group: 'Nemici'
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
      },
      group: 'Nemici'
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
      },
      group: 'Alleati'
    }
  ],
  notes: 'Sotto le rovine di Elidon, il gruppo ha infine risvegliato il Drago Rosso Antico.\n\nNote di gioco:\n- Il drago lancia soffio di fuoco ogni 3 turni.\n- Zephyr ha posizionato una trappola vicino alla colonna est.\n- PNG Chierico cura il barbaro se scende sotto i 15 HP.',
  campaignNotes: 'Appunti pubblici della campagna:\n- Trovare il fabbro nella città bassa.\n- Pagare il debito alla gilda dei ladri (500mo).',
  lastRoll: null,
  selectedDice: 'd20',
  activePlayerId: null,
  theme: 'crimson',
  healthGroups: ['Nemici', 'Alleati', 'PG'],
  diceLabels: ['Tiro salvezza', 'Tiro attacco', 'Prova di abilità', 'Percezione', 'Danno']
};

export default function App() {
  const [state, setState] = useState<CampaignState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Basic schema check to prevent crashes
        if (parsed && typeof parsed === 'object' && 'title' in parsed) {
          return {
            ...DEFAULT_STATE,
            ...parsed,
            healthGroups: parsed.healthGroups || DEFAULT_STATE.healthGroups,
            diceLabels: parsed.diceLabels || DEFAULT_STATE.diceLabels,
          } as CampaignState;
        }
      }
    } catch (e) {
      console.error('Error loading state from localStorage:', e);
    }
    return DEFAULT_STATE;
  });

  type AppMode = 'welcome' | 'lite' | 'master_x' | 'participant_x' | 'shared_x';
  const [appMode, setAppMode] = useState<AppMode>('welcome');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const [isSharedMode, setIsSharedMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isExternalUpdateRef = useRef(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Check if we are in shared URL mode (?shared=true)
  const [isUrlShared, setIsUrlShared] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('shared') === 'true') {
        setIsUrlShared(true);
        if (params.get('room')) {
           setAppMode('shared_x'); // Read-only shared view for X
           setRoomId(params.get('room'));
           subscribeToRoom(params.get('room')!, (newRoomState) => {
               if (newRoomState) setRoomState(newRoomState);
           });
        } else {
           setAppMode('lite');
        }
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
          
          isExternalUpdateRef.current = true;
          setState((current) => {
            if (JSON.stringify(current) === JSON.stringify(parsed)) {
              isExternalUpdateRef.current = false;
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
    if (!broadcastChannelRef.current) broadcastChannelRef.current = new BroadcastChannel('fantasia_campaign_channel');
    const channel = broadcastChannelRef.current;
    channel.onmessage = (event) => {
      if (event.data && typeof event.data === 'object' && event.data.title) {
        isExternalUpdateRef.current = true;
        setState((current) => {
          if (JSON.stringify(current) === JSON.stringify(event.data)) {
            isExternalUpdateRef.current = false;
            return current;
          }
          return event.data;
        });
      }
    };

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      channel.close();
      broadcastChannelRef.current = null;
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
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  useEffect(() => {
    if (!isSettingsOpen) {
      setIsConfirmingReset(false);
    }
  }, [isSettingsOpen]);

  const handleResetAll = () => {
    setState({
      title: 'Nuova Campagna',
      scheduleDay: '',
      scheduleTime: '',
      players: [],
      healthBars: [],
      notes: '',
      campaignNotes: '',
      lastRoll: null,
      selectedDice: 'd20',
      activePlayerId: null,
      theme: 'crimson',
      healthGroups: ['Nemici', 'Alleati', 'PG'],
      diceLabels: ['Tiro salvezza', 'Tiro attacco', 'Prova di abilità', 'Percezione', 'Danno']
    });
    setIsConfirmingReset(false);
    setIsSettingsOpen(false);
  };

  useEffect(() => {
    localStorage.setItem('fantasia_muted', isMuted ? 'true' : 'false');
    setMuted(isMuted);
  }, [isMuted]);

  // Autosave and broadcast to other tabs whenever state changes
  useEffect(() => {
    try {
      // Only save and broadcast if the state change was initiated locally
      if (isExternalUpdateRef.current) {
        isExternalUpdateRef.current = false; // Reset the flag
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage(state);
        }
      }
    } catch (e) {
      console.error('Error saving or broadcasting state:', e);
    }
  }, [state]);

  // Campaign Header Handlers
  const handleTitleChange = (newTitle: string) => {
    setState((prev) => ({ ...prev, title: newTitle }));
  };

  const handleScheduleChange = (day: string, time: string) => {
    setState((prev) => ({ ...prev, scheduleDay: day, scheduleTime: time }));
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
  const handleRoll = (diceType: string, result: number, label?: string) => {
    const newRoll = {
      diceType,
      result,
      timestamp: Date.now(),
      label: label || ''
    };
    
    setState((prev) => {
      const prevHistory = prev.rollHistory || [];
      const newHistory = [newRoll, ...prevHistory].slice(0, 20); // Keep last 20 rolls
      return {
        ...prev,
        lastRoll: newRoll,
        rollHistory: newHistory
      };
    });
  };

  const toggleRollVisibility = () => {
    setState((prev) => ({ ...prev, isRollHidden: !prev.isRollHidden }));
  };

  const handleClearRollHistory = () => {
    setState((prev) => ({ ...prev, rollHistory: [] }));
  };

  const handleSelectedDiceChange = (dice: string) => {
    setState((prev) => ({ ...prev, selectedDice: dice }));
  };

  const handleAddDiceLabel = (label: string) => {
    setState((prev) => {
      const currentLabels = prev.diceLabels || ['Tiro salvezza', 'Tiro attacco', 'Prova di abilità', 'Percezione', 'Danno'];
      if (currentLabels.includes(label)) return prev;
      return {
        ...prev,
        diceLabels: [...currentLabels, label]
      };
    });
  };

  const handleRenameDiceLabel = (oldLabel: string, newLabel: string) => {
    setState((prev) => {
      const currentLabels = prev.diceLabels || ['Tiro salvezza', 'Tiro attacco', 'Prova di abilità', 'Percezione', 'Danno'];
      const updatedLabels = currentLabels.map((l) => (l === oldLabel ? newLabel : l));
      
      const updatedRoll = prev.lastRoll && prev.lastRoll.label === oldLabel 
        ? { ...prev.lastRoll, label: newLabel } 
        : prev.lastRoll;

      return {
        ...prev,
        diceLabels: updatedLabels,
        lastRoll: updatedRoll
      };
    });
  };

  const handleDeleteDiceLabel = (label: string) => {
    setState((prev) => {
      const currentLabels = prev.diceLabels || ['Tiro salvezza', 'Tiro attacco', 'Prova di abilità', 'Percezione', 'Danno'];
      const updatedLabels = currentLabels.filter((l) => l !== label);

      const updatedRoll = prev.lastRoll && prev.lastRoll.label === label 
        ? { ...prev.lastRoll, label: undefined } 
        : prev.lastRoll;

      return {
        ...prev,
        diceLabels: updatedLabels,
        lastRoll: updatedRoll
      };
    });
  };

  // Health Groups Handlers
  const handleAddGroup = (group: string) => {
    setState((prev) => {
      const currentGroups = prev.healthGroups || ['Nemici', 'Alleati', 'PG'];
      if (currentGroups.includes(group)) return prev;
      return {
        ...prev,
        healthGroups: [...currentGroups, group]
      };
    });
  };

  const handleRenameGroup = (oldName: string, newName: string) => {
    setState((prev) => {
      const currentGroups = prev.healthGroups || ['Nemici', 'Alleati', 'PG'];
      const updatedGroups = currentGroups.map((g) => (g === oldName ? newName : g));
      
      const updatedBars = prev.healthBars.map((bar) => 
        bar.group === oldName ? { ...bar, group: newName } : bar
      );

      return {
        ...prev,
        healthGroups: updatedGroups,
        healthBars: updatedBars
      };
    });
  };

  const handleDeleteGroup = (group: string) => {
    setState((prev) => {
      const currentGroups = prev.healthGroups || ['Nemici', 'Alleati', 'PG'];
      const updatedGroups = currentGroups.filter((g) => g !== group);

      const updatedBars = prev.healthBars.map((bar) => 
        bar.group === group ? { ...bar, group: undefined } : bar
      );

      return {
        ...prev,
        healthGroups: updatedGroups,
        healthBars: updatedBars
      };
    });
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

  const handleCampaignNotesChange = (text: string) => {
    setState((prev) => ({ ...prev, campaignNotes: text }));
  };

  // JSON Import & Export functions
  const handleExportState = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      // Clean Campaign name for file naming
      const cleanCampName = state.title.toLowerCase().replace(/[^a-z0-9]/gi, '_').substring(0, 20);
      downloadAnchor.setAttribute('download', `fantasia_sessione_${cleanCampName || 'campagna'}.json`);
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

  // Effect to sync master state changes back to firebase
  useEffect(() => {
    if (appMode === 'master_x' && roomId) {
       updateRoomCampaign(roomId, state).catch(console.error);
    }
  }, [state, appMode, roomId]);

  useEffect(() => {
    if (appMode === 'master_x' && roomId) {
      const handleBeforeUnload = () => {
         // Fire and forget delete
         deleteRoom(roomId).catch(console.error);
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
         window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [appMode, roomId]);

  // Entirely render the Shared view if we are on the dedicated player URL
  if (isUrlShared) {
    if (appMode === 'shared_x') {
      if (!roomState) {
        return (
          <div className="min-h-screen bg-[#0c0d10] text-slate-400 flex flex-col gap-4 items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p>Caricamento schermo condiviso...</p>
          </div>
        );
      }
      return <SharedView state={roomState.campaign} isLite={false} roomUsers={roomState.users} participantRolls={roomState.participantRolls} />;
    }
    return <SharedView state={state} isLite={true} roomUsers={roomState?.users} participantRolls={roomState?.participantRolls} />;
  }

  if (appMode === 'welcome') {
    return (
      <WelcomeScreen 
        isLoading={isConnecting}
        onSelectLite={() => setAppMode('lite')}
        onSelectMaster={async () => {
          setIsConnecting(true);
          try {
            const newPin = await createRoom(state);
            setRoomId(newPin);
            setAppMode('master_x');
            // start listening to room users/rolls
            subscribeToRoom(newPin, (newRoomState) => {
               if (newRoomState) setRoomState(newRoomState);
            });
          } catch (e) {
            console.error('Error creating room', e);
            alert('Errore Firebase: Assicurati di aver configurato il file firebase.ts con le API Keys giuste o controlla la tua connessione.');
          } finally {
            setIsConnecting(false);
          }
        }}
        onSelectParticipant={async (pin) => {
          setIsConnecting(true);
          try {
            const newUserId = 'user_' + Math.random().toString(36).substr(2, 9);
            const userName = 'Utente ' + Math.floor(100 + Math.random() * 900);
            await joinRoom(pin, newUserId, userName);
            setUserId(newUserId);
            setRoomId(pin);
            setAppMode('participant_x');
            
            subscribeToRoom(pin, (newRoomState) => {
               if (newRoomState) setRoomState(newRoomState);
            });
            
          } catch (e) {
            alert('Errore Firebase o stanza non trovata. Controlla il PIN e firebase.ts');
          } finally {
            setIsConnecting(false);
          }
        }}
      />
    );
  }

  if (appMode === 'participant_x') {
    if (!roomState) return <div className="min-h-screen bg-[#0c0d10] text-slate-400 flex items-center justify-center">Caricamento stato...</div>;
    return <ParticipantView roomId={roomId!} userId={userId!} roomState={roomState} />;
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
        <SharedView state={state} isLite={appMode === 'lite'} roomUsers={roomState?.users} participantRolls={roomState?.participantRolls} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-bento-bg text-slate-100 p-4 md:p-8 flex flex-col font-sans selection:bg-slate-600/30 selection:text-slate-200`}>
      
      {/* Immersive background decoration */}
      <div className={`absolute top-0 left-0 right-0 h-[500px] bg-gradient-radial ${colors.glow} to-transparent pointer-events-none z-0`} />
      
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
              const width = 1280;
              const height = 800;
              const left = (window.screen.width / 2) - (width / 2);
              const top = (window.screen.height / 2) - (height / 2);
              window.open(
                `${window.location.origin}${window.location.pathname}?shared=true${roomId ? `&room=${roomId}` : ''}`, 
                'SharedViewWindow',
                `toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,copyhistory=no,width=${width},height=${height},top=${top},left=${left}`
              );
            }}
            className="px-3.5 py-2 bg-bento-panel hover:bg-bento-button text-slate-300 border border-bento-border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Apri lo Schermo Condiviso in una finestra separata per i giocatori (ideale per un secondo monitor o proiettore)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            Schermo Giocatori (Pop-up)
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
                isSettingsOpen ? `text-slate-100 ring-2 ring-slate-500/20` : ''
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

                  {/* Complete Reset section */}
                  <div className="pt-3 border-t border-bento-border space-y-2">
                    {!isConfirmingReset ? (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingReset(true)}
                        className="w-full py-2 bg-red-950/20 hover:bg-red-950/30 border border-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Resetta completamente tutti i dati"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        Reset Completo
                      </button>
                    ) : (
                      <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-2.5 space-y-2 text-center">
                        <p className="text-[10px] text-red-400 font-mono leading-normal font-semibold">
                          Sei sicuro? Questa azione è irreversibile e cancellerà tutto.
                        </p>
                        <div className="flex gap-1.5 justify-center">
                          <button
                            type="button"
                            onClick={handleResetAll}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold font-mono transition-colors cursor-pointer"
                          >
                            SI, RESETTA
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsConfirmingReset(false)}
                            className="px-2.5 py-1 bg-[#16181f] border border-bento-border text-slate-300 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer"
                          >
                            ANNULLA
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {appMode === 'master_x' && roomState && (
        <div className="max-w-7xl mx-auto w-full mb-8 relative z-10 flex flex-col gap-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
            <div className="flex flex-col items-start gap-2">
              <div className="flex flex-col gap-2 min-w-[140px]">
                <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-4 text-center shadow-inner">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-blue-400 font-bold block mb-1">PIN STANZA</span>
                  <span className="text-4xl font-display font-black tracking-widest text-white">{roomId}</span>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Vuoi davvero chiudere questa stanza? Tutti i giocatori verranno disconnessi.')) {
                      deleteRoom(roomId!).catch(console.error);
                      setAppMode('welcome');
                      setRoomId(null);
                      setRoomState(null);
                    }
                  }}
                  className="w-full py-2 bg-red-950/30 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Chiudi Stanza
                </button>
              </div>
              <p className="text-slate-300 text-sm max-w-sm mt-2">
                Comunica questo PIN ai giocatori per farli accedere alla stanza.
              </p>
            </div>
            
            <div className="flex-1 bg-[#0c0d10] border border-bento-border rounded-xl p-4 min-h-[100px] flex flex-col gap-2 overflow-y-auto max-h-[160px] w-full">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Giocatori Connessi</span>
              {Object.keys(roomState.users || {}).length === 0 ? (
                <span className="text-xs text-slate-600 italic">In attesa di connessioni...</span>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(Object.values(roomState.users || {}) as RoomUser[]).map(user => (
                    <div key={user.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-2 text-xs flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{user.name}</span>
                        <span className="text-[9px] font-mono text-slate-500">{user.id.slice(0,5)}</span>
                      </div>
                      <select
                        value={user.assignedPlayerId || ''}
                        onChange={(e) => {
                          updateUser(roomId as string, user.id, { assignedPlayerId: e.target.value || null }).catch(console.error);
                        }}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-slate-300 w-full cursor-pointer"
                      >
                        <option value="">- Spettatore -</option>
                        {state.players.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
          
          {/* Master View of Participant Rolls */}
          {roomState.participantRolls && roomState.participantRolls.length > 0 && (
             <div className="bg-bento-panel border border-bento-border rounded-xl p-4 flex flex-col gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-display block">Lanci dei Giocatori</span>
                <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-2">
                  {roomState.participantRolls.slice().reverse().map((roll, i) => {
                     const labelParts = roll.label ? roll.label.split('|') : [];
                     let displayName = 'Sconosciuto';
                     let rollLabel = '';
                     if (labelParts.length >= 2) {
                       const rollerId = labelParts[0];
                       const rollUserName = labelParts[1];
                       rollLabel = labelParts.slice(2).join('|');
                       const roller = (Object.values(roomState.users || {}) as RoomUser[]).find(u => u.id === rollerId);
                       if (roller) {
                          const assignedPlayer = state.players.find(p => p.id === roller.assignedPlayerId);
                          displayName = assignedPlayer ? assignedPlayer.name : roller.name;
                       } else {
                          displayName = rollUserName;
                       }
                     } else if (labelParts.length === 1) {
                       rollLabel = labelParts[0];
                     }
                     
                     return (
                       <div key={i} className="bg-[#0c0d10] border border-slate-700/50 rounded-lg p-3 min-w-[150px] shrink-0 flex flex-col relative overflow-hidden group hover:border-slate-600 transition-colors">
                          <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-1 gap-2">
                            <span className="text-[11px] font-mono font-bold text-slate-300 truncate" title={displayName}>{displayName}</span>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">{roll.diceType}</span>
                          </div>
                          <div className="flex justify-center py-2">
                            <span className="text-4xl font-display font-black text-white">{roll.result}</span>
                          </div>
                          {rollLabel && (
                            <div className="mt-1 flex justify-center">
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full truncate max-w-full" title={rollLabel}>{rollLabel}</span>
                            </div>
                          )}
                       </div>
                     );
                  })}
                </div>
             </div>
          )}
        </div>
      )}

      {/* Main Content Sections */}
      <main className="max-w-7xl mx-auto w-full flex-grow space-y-6 relative z-10">
        
        {/* Campaign title and Initiative */}
        <CampaignHeader
          title={state.title}
          scheduleDay={state.scheduleDay}
          scheduleTime={state.scheduleTime}
          onTitleChange={handleTitleChange}
          onScheduleChange={handleScheduleChange}
          players={state.players}
          onAddPlayer={handleAddPlayer}
          onRemovePlayer={handleRemovePlayer}
          onReorderPlayers={handleReorderPlayers}
          notes={state.notes}
          onNotesChange={handleNotesChange}
          campaignNotes={state.campaignNotes || ''}
          onCampaignNotesChange={handleCampaignNotesChange}
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
              healthGroups={state.healthGroups || ['Nemici', 'Alleati', 'PG']}
              onAddHealthBar={handleAddHealthBar}
              onUpdateHealthBar={handleUpdateHealthBar}
              onDeleteHealthBar={handleDeleteHealthBar}
              onAddGroup={handleAddGroup}
              onRenameGroup={handleRenameGroup}
              onDeleteGroup={handleDeleteGroup}
              theme={theme}
            />
          </div>

          {/* Dice Roller (col-span-5) */}
          <div className="lg:col-span-5 flex">
            <div className="w-full h-full">
              <DiceRoller
                onRoll={handleRoll}
                lastRoll={state.lastRoll}
                rollHistory={state.rollHistory}
                isRollHidden={state.isRollHidden}
                onToggleRollVisibility={toggleRollVisibility}
                onClearHistory={handleClearRollHistory}
                selectedDice={state.selectedDice}
                onSelectedDiceChange={handleSelectedDiceChange}
                theme={theme}
                diceLabels={state.diceLabels || ['Tiro salvezza', 'Tiro attacco', 'Prova di abilità', 'Percezione', 'Danno']}
                onAddDiceLabel={handleAddDiceLabel}
                onRenameDiceLabel={handleRenameDiceLabel}
                onDeleteDiceLabel={handleDeleteDiceLabel}
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
