import React, { useState } from 'react';
import { Player } from '../types';
import { Users, Plus, Trash2, GripVertical, Edit2, Check, BookOpen, Copy, Star } from 'lucide-react';
import { CampaignTheme, getThemeColors } from '../theme';

interface CampaignHeaderProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  players: Player[];
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onReorderPlayers: (startIndex: number, endIndex: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  activePlayerId: string | null;
  onSetActivePlayer: (id: string | null) => void;
  theme: CampaignTheme;
  setTheme: (theme: CampaignTheme) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

export const CampaignHeader: React.FC<CampaignHeaderProps> = ({
  title,
  onTitleChange,
  players,
  onAddPlayer,
  onRemovePlayer,
  onReorderPlayers,
  notes,
  onNotesChange,
  activePlayerId,
  onSetActivePlayer,
  theme,
  setTheme,
  isMuted,
  setIsMuted,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const colors = getThemeColors(theme);
  const colorName = theme === 'sapphire' ? 'blue' : theme === 'crimson' ? 'red' : theme;

  const handleTitleSubmit = () => {
    if (tempTitle.trim()) {
      onTitleChange(tempTitle.trim());
      setIsEditingTitle(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTempTitle(title);
      setIsEditingTitle(false);
    }
  };

  const handleAddPlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlayerName.trim()) {
      onAddPlayer(newPlayerName.trim());
      setNewPlayerName('');
    }
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Essential for Firefox support
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      onReorderPlayers(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="bg-bento-panel border border-bento-border rounded-xl p-6 shadow-xl relative overflow-hidden">
      {/* Visual background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-glow rounded-full blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start relative z-10">
        
        {/* Campaign Title Input */}
        <div className="md:col-span-7 flex flex-col justify-center min-h-[80px]">
          <span className={`text-xs uppercase font-mono tracking-widest ${colors.text} font-semibold mb-1`}>
            Campagna Corrente
          </span>
          {isEditingTitle ? (
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleTitleKeyDown}
                className={`text-2xl md:text-3xl font-display font-bold text-slate-100 bg-[#0c0d10] border border-bento-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-${colorName}-500/50 w-full`}
                autoFocus
                maxLength={60}
              />
              <button
                onClick={handleTitleSubmit}
                className={`p-2 ${colors.bg} text-white border ${colors.border} ${colors.hoverBg} rounded-lg transition-colors shadow-lg ${colors.shadow} cursor-pointer`}
                title="Salva Titolo"
              >
                <Check className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 group">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-100 tracking-wide line-clamp-1">
                {title || "Senza Nome"}
              </h1>
              <button
                onClick={() => {
                  setTempTitle(title);
                  setIsEditingTitle(true);
                }}
                className={`opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 text-slate-400 hover:${colors.text} hover:bg-[#21242c] rounded-md transition-all cursor-pointer`}
                title="Modifica Titolo"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}
          {/* Integrated Notes Area */}
          <div className="mt-4 flex flex-col relative w-full group/notes">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5 font-semibold">
                <BookOpen className={`w-3.5 h-3.5 ${colors.text}`} />
                Appunti della Campagna
              </label>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(notes);
                }}
                className="p-1 hover:bg-[#21242c] rounded text-slate-500 hover:text-slate-200 transition-all flex items-center gap-1 text-[10px] cursor-pointer"
                title="Copia appunti"
              >
                <Copy className="w-3 h-3" />
                Copia
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Scrivi qui i tuoi appunti della sessione (es. trame, PNG incontrati, indizi trovati...)"
              className={`w-full h-28 bg-[#0c0d10] border border-bento-border focus:border-${colorName}-500/40 text-slate-200 placeholder-slate-600 text-xs rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-${colorName}-500/20 leading-relaxed resize-none font-sans`}
            />
          </div>
        </div>

        {/* Players / Initiative Order Section */}
        <div className="md:col-span-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider font-display text-slate-200 flex items-center gap-2">
              <Users className={`w-4 h-4 ${colors.text}`} />
              Partecipanti ({players.length})
            </h3>
            <span className="text-xs text-slate-400 font-mono italic">
              Trascina per ordinare
            </span>
          </div>

          {/* Add Player Input */}
          <form onSubmit={handleAddPlayerSubmit} className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Nome nuovo giocatore..."
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className={`bg-[#0c0d10] border border-bento-border focus:border-${colorName}-500/50 text-slate-100 placeholder-slate-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-${colorName}-500/30 flex-grow`}
              maxLength={24}
            />
            <button
              type="submit"
              disabled={!newPlayerName.trim()}
              className={`px-3 py-2 ${colors.bg} hover:${colors.hoverBg} text-white border ${colors.border} rounded-lg text-sm font-semibold flex items-center gap-1 transition-all disabled:opacity-50 disabled:hover:${colors.bg} cursor-pointer`}
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Aggiungi
            </button>
          </form>

          {/* Draggable Players List */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {players.length === 0 ? (
              <div className="text-center py-4 text-slate-500 bg-[#0c0d10] border border-dashed border-bento-border rounded-lg text-xs italic">
                Nessun giocatore aggiunto. Aggiungine uno sopra per iniziare!
              </div>
            ) : (
              players.map((player, index) => {
                const isDragged = index === draggedIndex;
                const isOver = index === dragOverIndex;

                return (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all border cursor-grab active:cursor-grabbing ${
                      isDragged
                        ? 'opacity-30 bg-[#21242c]/20 border-dashed border-[#2d3139] scale-95'
                        : isOver
                        ? `bg-${colorName}-500/10 border-${colorName}-500/50 translate-y-1`
                        : 'bg-[#0c0d10] border-bento-border hover:bg-[#21242c] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-slate-500 hover:text-slate-300">
                        <GripVertical className="w-4 h-4 cursor-grab" />
                      </div>
                      
                      {/* Active Turn Star Selector */}
                      <button
                        type="button"
                        onClick={() => {
                          if (activePlayerId === player.id) {
                            onSetActivePlayer(null);
                          } else {
                            onSetActivePlayer(player.id);
                          }
                        }}
                        className={`p-1 rounded-full transition-all cursor-pointer ${
                          activePlayerId === player.id
                            ? `${colors.text} ${colors.glowBg} scale-110 animate-pulse`
                            : `text-slate-600 hover:${colors.textActive} hover:bg-[#21242c]`
                        }`}
                        title={activePlayerId === player.id ? "Giocatore Attivo (Clicca per disattivare)" : "Segna come Turno Attivo"}
                      >
                        <Star className={`w-4 h-4 ${activePlayerId === player.id ? colors.fill : ''}`} />
                      </button>

                      <span className={`font-medium transition-colors ${
                        activePlayerId === player.id ? `${colors.textActive} font-bold` : 'text-slate-200'
                      }`}>
                        {player.name}
                      </span>
                    </div>
                    <button
                      onClick={() => onRemovePlayer(player.id)}
                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all cursor-pointer"
                      title={`Rimuovi ${player.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
