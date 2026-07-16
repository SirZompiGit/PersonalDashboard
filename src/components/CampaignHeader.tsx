import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Player } from '../types';
import { Users, Plus, Trash2, GripVertical, Edit2, Check, BookOpen, Copy, Star, Search, X, Maximize2, Minimize2 } from 'lucide-react';
import { CampaignTheme, getThemeColors } from '../theme';

interface CampaignHeaderProps {
  title: string;
  scheduleDay?: string;
  scheduleTime?: string;
  onTitleChange: (newTitle: string) => void;
  onScheduleChange: (day: string, time: string) => void;
  players: Player[];
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onReorderPlayers: (startIndex: number, endIndex: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  campaignNotes: string;
  onCampaignNotesChange: (notes: string) => void;
  activePlayerId: string | null;
  onSetActivePlayer: (id: string | null) => void;
  theme: CampaignTheme;
  setTheme: (theme: CampaignTheme) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

export const CampaignHeader: React.FC<CampaignHeaderProps> = ({
  title,
  scheduleDay = '',
  scheduleTime = '',
  onTitleChange,
  onScheduleChange,
  players,
  onAddPlayer,
  onRemovePlayer,
  onReorderPlayers,
  notes,
  onNotesChange,
  campaignNotes,
  onCampaignNotesChange,
  activePlayerId,
  onSetActivePlayer,
  theme,
  setTheme,
  isMuted,
  setIsMuted,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [tempScheduleDay, setTempScheduleDay] = useState(scheduleDay);
  const [tempScheduleTime, setTempScheduleTime] = useState(scheduleTime);
  const [newPlayerName, setNewPlayerName] = useState('');

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const colors = getThemeColors(theme);
  const colorName = theme === 'sapphire' ? 'blue' : theme === 'crimson' ? 'red' : theme;

  const [searchQuery, setSearchQuery] = useState('');
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  
  const [campaignSearchQuery, setCampaignSearchQuery] = useState('');
  const [isCampaignNotesExpanded, setIsCampaignNotesExpanded] = useState(false);

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const renderHighlightedText = (text: string, search: string) => {
    if (!search.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${escapeRegExp(search)})`, 'gi'));
    return (
      <span>
        {parts.map((part, index) => 
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={index} className="bg-amber-500/35 text-amber-200 font-bold px-1 rounded-sm">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const allLines = notes.split('\n');
  const filteredLines = searchQuery.trim() 
    ? allLines.filter(line => line.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleTitleSubmit = () => {
    if (tempTitle.trim()) {
      onTitleChange(tempTitle.trim());
      setIsEditingTitle(false);
    }
  };

  const handleScheduleSubmit = () => {
    onScheduleChange(tempScheduleDay.trim(), tempScheduleTime.trim());
    setIsEditingSchedule(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTempTitle(title);
      setIsEditingTitle(false);
    }
  };

  const handleScheduleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScheduleSubmit();
    } else if (e.key === 'Escape') {
      setTempScheduleDay(scheduleDay);
      setTempScheduleTime(scheduleTime);
      setIsEditingSchedule(false);
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
      <div className={`absolute top-0 right-0 w-64 h-64 ${colors.glowBg} rounded-full blur-3xl pointer-events-none`} />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-glow rounded-full blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start relative z-10">
        
        {/* Campaign Title Input */}
        <div className="md:col-span-7 flex flex-col justify-center min-h-[80px]">
          <span className={`text-xs uppercase font-mono tracking-widest ${colors.text} font-semibold mb-1`}>
            Campagna Corrente
          </span>
          <div className="flex flex-col gap-2">
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
              {/* Title Section */}
              <div className="flex items-center gap-2 group/title">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      className={`text-2xl md:text-3xl font-display font-bold text-slate-100 bg-[#0c0d10] border border-bento-border rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:${colors.ring} w-full`}
                      autoFocus
                      maxLength={60}
                      placeholder="Nome Campagna"
                    />
                    <button
                      onClick={handleTitleSubmit}
                      className={`p-1.5 ${colors.bg} text-white border ${colors.border} ${colors.hoverBg} rounded-lg transition-colors shadow-lg ${colors.shadow} cursor-pointer shrink-0`}
                      title="Salva Titolo"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-100 tracking-wide line-clamp-1">
                      {title || "Senza Nome"}
                    </h1>
                    <button
                      onClick={() => {
                        setTempTitle(title);
                        setIsEditingTitle(true);
                      }}
                      className={`opacity-0 group-hover/title:opacity-100 focus:opacity-100 p-1.5 text-slate-400 hover:${colors.text} hover:bg-[#21242c] rounded-md transition-all cursor-pointer shrink-0`}
                      title="Modifica Titolo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {!isEditingTitle && <span className="text-slate-600 font-light hidden md:inline">|</span>}

              {/* Schedule Section */}
              <div className="flex items-center gap-2 group/schedule">
                {isEditingSchedule ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tempScheduleDay}
                      onChange={(e) => setTempScheduleDay(e.target.value)}
                      onKeyDown={handleScheduleKeyDown}
                      className={`text-sm md:text-base font-display text-slate-300 bg-[#0c0d10] border border-bento-border rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:${colors.ring} w-[120px]`}
                      placeholder="Giorno"
                      autoFocus
                    />
                    <input
                      type="time"
                      value={tempScheduleTime}
                      onChange={(e) => setTempScheduleTime(e.target.value)}
                      onKeyDown={handleScheduleKeyDown}
                      className={`text-sm md:text-base font-display text-slate-300 bg-[#0c0d10] border border-bento-border rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:${colors.ring} w-[110px]`}
                    />
                    <button
                      onClick={handleScheduleSubmit}
                      className={`p-1.5 ${colors.bg} text-white border ${colors.border} ${colors.hoverBg} rounded-lg transition-colors shadow-lg ${colors.shadow} cursor-pointer`}
                      title="Salva Programmazione"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-lg md:text-xl text-slate-400 font-normal">
                      {(scheduleDay || scheduleTime) ? [scheduleDay, scheduleTime].filter(Boolean).join(' - ') : <span className="text-sm italic text-slate-500">Imposta orario</span>}
                    </span>
                    <button
                      onClick={() => {
                        setTempScheduleDay(scheduleDay || '');
                        setTempScheduleTime(scheduleTime || '');
                        setIsEditingSchedule(true);
                      }}
                      className={`opacity-0 group-hover/schedule:opacity-100 focus:opacity-100 p-1.5 text-slate-400 hover:${colors.text} hover:bg-[#21242c] rounded-md transition-all cursor-pointer`}
                      title="Modifica Programmazione"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Integrated Notes Area */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
            {/* Master Notes */}
            <div className="flex flex-col relative w-full group/notes">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 mb-2">
                <label className="text-xs uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5 font-semibold shrink-0">
                  <BookOpen className={`w-3.5 h-3.5 ${colors.text}`} />
                  Appunti Master (Privati)
                </label>

                <div className="flex items-center gap-2 self-end xl:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsNotesExpanded(true)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-bento-border/40 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-1 text-[10px] cursor-pointer font-medium"
                    title="Espandi appunti a tutto schermo"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Espandi</span>
                  </button>
                </div>
              </div>

              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Scrivi qui i tuoi appunti privati della sessione..."
                className={`w-full h-28 bg-[#0c0d10] border border-bento-border focus:${colors.border} text-slate-200 placeholder-slate-600 text-xs rounded-lg p-3 focus:outline-none focus:ring-1 focus:${colors.ring} leading-relaxed resize-y font-sans`}
              />
            </div>

            {/* Campaign Notes */}
            <div className="flex flex-col relative w-full group/campaignNotes">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 mb-2">
                <label className="text-xs uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5 font-semibold shrink-0">
                  <BookOpen className={`w-3.5 h-3.5 ${colors.text}`} />
                  Appunti Campagna (Pubblici)
                </label>

                <div className="flex items-center gap-2 self-end xl:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsCampaignNotesExpanded(true)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-bento-border/40 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-1 text-[10px] cursor-pointer font-medium"
                    title="Espandi appunti campagna a tutto schermo"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Espandi</span>
                  </button>
                </div>
              </div>

              <textarea
                value={campaignNotes}
                onChange={(e) => onCampaignNotesChange(e.target.value)}
                placeholder="Scrivi qui gli appunti visibili ai giocatori nella schermata Condivisa..."
                className={`w-full h-28 bg-[#0c0d10] border border-bento-border focus:${colors.border} text-slate-200 placeholder-slate-600 text-xs rounded-lg p-3 focus:outline-none focus:ring-1 focus:${colors.ring} leading-relaxed resize-y font-sans`}
              />
            </div>
          </div>
          
          {/* Expanded Master Notes Modal */}
          {isNotesExpanded && createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-fadeIn">
              <div className="bg-bento-panel border border-bento-border rounded-xl p-6 sm:p-8 shadow-2xl flex flex-col w-full max-w-5xl h-full max-h-[90vh] relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <label className="text-sm uppercase font-mono tracking-wider text-slate-200 flex items-center gap-1.5 font-bold shrink-0">
                    <BookOpen className={`w-4 h-4 ${colors.text}`} />
                    Appunti Master (Privati)
                  </label>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {/* Real-time search bar */}
                    <div className="flex items-center bg-[#0c0d10] border border-bento-border focus-within:border-slate-500 rounded-lg px-2 py-1.5 transition-all w-64">
                      <Search className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1.5" />
                      <input
                        type="text"
                        placeholder="Cerca negli appunti..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent text-slate-100 placeholder-slate-600 text-xs focus:outline-none w-full font-sans"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="text-slate-500 hover:text-slate-300 p-0.5 shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsNotesExpanded(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-bento-border/40 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs cursor-pointer font-medium"
                      title="Riduci appunti"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                      Riduci
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(notes);
                      }}
                      className="px-3 py-1.5 hover:bg-[#21242c] border border-bento-border/40 rounded-lg text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5 text-xs cursor-pointer"
                      title="Copia appunti"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copia
                    </button>
                  </div>
                </div>

                <div className="flex-grow flex flex-col relative min-h-0">
                  <textarea
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                    placeholder="Scrivi qui i tuoi appunti privati della sessione..."
                    className={`w-full flex-grow bg-[#0c0d10] border border-bento-border focus:${colors.border} text-slate-200 placeholder-slate-600 text-sm rounded-lg p-4 focus:outline-none focus:ring-1 focus:${colors.ring} leading-relaxed resize-y font-sans`}
                  />
                  
                  {/* Matching search highlights panel inside modal */}
                  {searchQuery.trim() && (
                    <div className="absolute bottom-4 left-4 right-4 p-3 bg-[#08090c]/95 backdrop-blur border border-bento-border/80 rounded-lg text-sm space-y-2 max-h-48 overflow-y-auto animate-fadeIn shadow-2xl">
                      <div className="flex justify-between items-center text-xs uppercase font-mono text-slate-500 pb-2 border-b border-bento-border/30">
                        <span className="flex items-center gap-1.5">
                          <Search className="w-3.5 h-3.5 text-amber-500" /> Risultati corrispondenti
                        </span>
                        <span>{filteredLines.length} {filteredLines.length === 1 ? 'riga trovata' : 'righe trovate'}</span>
                      </div>
                      {filteredLines.length === 0 ? (
                        <p className="text-xs text-slate-600 italic">Nessun risultato trovato per "{searchQuery}".</p>
                      ) : (
                        <div className="space-y-2.5 mt-2">
                          {filteredLines.map((line, i) => (
                            <p key={i} className="text-xs text-slate-300 leading-relaxed font-sans bg-bento-panel/50 p-2 rounded border border-bento-border/30">
                              <span className="text-[10px] text-slate-500 font-mono mr-1.5">linea:</span> {renderHighlightedText(line, searchQuery)}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Expanded Campaign Notes Modal */}
          {isCampaignNotesExpanded && createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-fadeIn">
              <div className="bg-bento-panel border border-bento-border rounded-xl p-6 sm:p-8 shadow-2xl flex flex-col w-full max-w-5xl h-full max-h-[90vh] relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <label className="text-sm uppercase font-mono tracking-wider text-slate-200 flex items-center gap-1.5 font-bold shrink-0">
                    <BookOpen className={`w-4 h-4 ${colors.text}`} />
                    Appunti Campagna (Pubblici)
                  </label>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {/* Real-time search bar */}
                    <div className="flex items-center bg-[#0c0d10] border border-bento-border focus-within:border-slate-500 rounded-lg px-2 py-1.5 transition-all w-64">
                      <Search className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1.5" />
                      <input
                        type="text"
                        placeholder="Cerca negli appunti..."
                        value={campaignSearchQuery}
                        onChange={(e) => setCampaignSearchQuery(e.target.value)}
                        className="bg-transparent text-slate-100 placeholder-slate-600 text-xs focus:outline-none w-full font-sans"
                      />
                      {campaignSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCampaignSearchQuery('')}
                          className="text-slate-500 hover:text-slate-300 p-0.5 shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCampaignNotesExpanded(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-bento-border/40 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs cursor-pointer font-medium"
                      title="Riduci appunti"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                      Riduci
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(campaignNotes);
                      }}
                      className="px-3 py-1.5 hover:bg-[#21242c] border border-bento-border/40 rounded-lg text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5 text-xs cursor-pointer"
                      title="Copia appunti"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copia
                    </button>
                  </div>
                </div>

                <div className="flex-grow flex flex-col relative min-h-0">
                  <textarea
                    value={campaignNotes}
                    onChange={(e) => onCampaignNotesChange(e.target.value)}
                    placeholder="Scrivi qui gli appunti visibili ai giocatori nella schermata Condivisa..."
                    className={`w-full flex-grow bg-[#0c0d10] border border-bento-border focus:${colors.border} text-slate-200 placeholder-slate-600 text-sm rounded-lg p-4 focus:outline-none focus:ring-1 focus:${colors.ring} leading-relaxed resize-y font-sans`}
                  />
                  
                  {/* Matching search highlights panel inside modal */}
                  {campaignSearchQuery.trim() && (
                    <div className="absolute bottom-4 left-4 right-4 p-3 bg-[#08090c]/95 backdrop-blur border border-bento-border/80 rounded-lg text-sm space-y-2 max-h-48 overflow-y-auto animate-fadeIn shadow-2xl">
                      <div className="flex justify-between items-center text-xs uppercase font-mono text-slate-500 pb-2 border-b border-bento-border/30">
                        <span className="flex items-center gap-1.5">
                          <Search className="w-3.5 h-3.5 text-amber-500" /> Risultati corrispondenti
                        </span>
                        <span>{campaignNotes.split('\n').filter(line => line.toLowerCase().includes(campaignSearchQuery.toLowerCase())).length} {campaignNotes.split('\n').filter(line => line.toLowerCase().includes(campaignSearchQuery.toLowerCase())).length === 1 ? 'riga trovata' : 'righe trovate'}</span>
                      </div>
                      {campaignNotes.split('\n').filter(line => line.toLowerCase().includes(campaignSearchQuery.toLowerCase())).length === 0 ? (
                        <p className="text-xs text-slate-600 italic">Nessun risultato trovato per "{campaignSearchQuery}".</p>
                      ) : (
                        <div className="space-y-2.5 mt-2">
                          {campaignNotes.split('\n').filter(line => line.toLowerCase().includes(campaignSearchQuery.toLowerCase())).map((line, i) => (
                            <p key={i} className="text-xs text-slate-300 leading-relaxed font-sans bg-bento-panel/50 p-2 rounded border border-bento-border/30">
                              <span className="text-[10px] text-slate-500 font-mono mr-1.5">linea:</span> {renderHighlightedText(line, campaignSearchQuery)}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}
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
              className={`bg-[#0c0d10] border border-bento-border focus:${colors.border} text-slate-100 placeholder-slate-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:${colors.ring} flex-grow`}
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
                        ? `${colors.glowBg} ${colors.border} translate-y-1`
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
