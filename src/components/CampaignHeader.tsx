/**
 * Intestazione della campagna: titolo, programmazione, appunti, partecipanti.
 *
 * Interventi principali:
 *  - I due blocchi appunti erano copiati quasi identici, ~180 righe in tutto.
 *    Ora sono due istanze di NotesPanel.
 *  - Il riordino dei giocatori funzionava solo con il drag-and-drop HTML5, che
 *    su touch non esiste: ci sono anche pulsanti su/giù, utilizzabili da
 *    tastiera e da dito.
 *  - Il componente riceveva `setTheme`, `isMuted` e `setIsMuted` senza usarli mai.
 *  - Rimuovere un giocatore si può annullare.
 */

import { type DragEvent, type FormEvent, useState } from 'react';
import type { Player } from '../types';
import type { CampaignAction } from '../state/campaignReducer';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit2,
  GripVertical,
  Plus,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { NotesPanel } from './ui/NotesPanel';
import { IconButton } from './ui/IconButton';
import { useToasts } from '../hooks/useToasts';

/**
 * La dimensione del titolo scala con la sua lunghezza.
 * Prima era fissa e i titoli lunghi venivano semplicemente tagliati con i
 * puntini di sospensione, rendendo illeggibile il nome della campagna.
 */
function titleSizeClass(title: string): string {
  const length = title.length;
  if (length <= 24) return 'text-xl sm:text-2xl md:text-3xl';
  if (length <= 38) return 'text-lg sm:text-xl md:text-2xl';
  if (length <= 55) return 'text-base sm:text-lg md:text-xl';
  return 'text-sm sm:text-base md:text-lg';
}

interface CampaignHeaderProps {
  title: string;
  scheduleDay: string;
  scheduleTime: string;
  players: Player[];
  notes: string;
  campaignNotes: string;
  activePlayerId: string | null;
  dispatch: React.Dispatch<CampaignAction>;
}

export function CampaignHeader({
  title,
  scheduleDay,
  scheduleTime,
  players,
  notes,
  campaignNotes,
  activePlayerId,
  dispatch,
}: CampaignHeaderProps) {
  const { notifyUndo } = useToasts();

  const [editingTitle, setEditingTitle] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [tempDay, setTempDay] = useState(scheduleDay);
  const [tempTime, setTempTime] = useState(scheduleTime);
  const [newPlayerName, setNewPlayerName] = useState('');

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const submitTitle = () => {
    if (tempTitle.trim()) dispatch({ type: 'SET_TITLE', title: tempTitle });
    setEditingTitle(false);
  };

  const submitSchedule = () => {
    dispatch({ type: 'SET_SCHEDULE', day: tempDay, time: tempTime });
    setEditingSchedule(false);
  };

  const addPlayer = (event: FormEvent) => {
    event.preventDefault();
    if (!newPlayerName.trim()) return;
    dispatch({ type: 'ADD_PLAYER', name: newPlayerName });
    setNewPlayerName('');
  };

  const removePlayer = (player: Player, index: number) => {
    dispatch({ type: 'REMOVE_PLAYER', id: player.id });
    notifyUndo(`"${player.name}" rimosso.`, () =>
      dispatch({ type: 'INSERT_PLAYER', player, index }),
    );
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= players.length) return;
    dispatch({ type: 'REORDER_PLAYERS', from, to });
  };

  const handleDragStart = (event: DragEvent, index: number) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    // Necessario perché Firefox avvii il trascinamento.
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDrop = (event: DragEvent, index: number) => {
    event.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) move(draggedIndex, index);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const inputBase =
    'rounded-lg border border-bento-border bg-bento-bg text-slate-100 transition-colors duration-200 focus:border-theme-500 focus:outline-none focus:ring-1 focus:ring-theme-500/20';

  return (
    <section className="relative overflow-hidden rounded-xl border border-bento-border bg-bento-panel p-4 shadow-panel sm:p-6">
      {/* Aure decorative. Prima erano invisibili: `bg-gradient-radial` non
          esisteva come classe e la regola non produceva nulla. */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-theme-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-glow blur-3xl" />

      <div className="relative z-10 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col justify-center lg:col-span-7">
          <span className="mb-1 font-mono text-xs font-semibold uppercase tracking-widest text-theme-500">
            Campagna Corrente
          </span>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="group/title flex min-w-0 flex-1 items-center gap-2">
              {editingTitle ? (
                <div className="flex w-full items-center gap-2">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(event) => setTempTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') submitTitle();
                      if (event.key === 'Escape') {
                        setTempTitle(title);
                        setEditingTitle(false);
                      }
                    }}
                    autoFocus
                    maxLength={80}
                    placeholder="Nome Campagna"
                    aria-label="Nome della campagna"
                    className={`${inputBase} w-full px-3 py-1 font-display text-xl font-bold sm:text-2xl md:text-3xl`}
                  />
                  <IconButton label="Salva titolo" tone="positive" onClick={submitTitle}>
                    <Check className="h-5 w-5" />
                  </IconButton>
                </div>
              ) : (
                <>
                  <h1
                    title={title || undefined}
                    className={`line-clamp-2 min-w-0 font-display font-bold tracking-wide break-words text-slate-100 ${titleSizeClass(
                      title,
                    )}`}
                  >
                    {title || 'Senza Nome'}
                  </h1>
                  <span className="touch-visible shrink-0 opacity-0 transition-opacity duration-200 group-hover/title:opacity-100 group-focus-within/title:opacity-100">
                    <IconButton
                      label="Modifica titolo"
                      tone="accent"
                      onClick={() => {
                        setTempTitle(title);
                        setEditingTitle(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </IconButton>
                  </span>
                </>
              )}
            </div>

            <div className="group/schedule flex shrink-0 items-center gap-2">
              {editingSchedule ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={tempDay}
                    onChange={(event) => setTempDay(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') submitSchedule();
                      if (event.key === 'Escape') setEditingSchedule(false);
                    }}
                    placeholder="Giorno"
                    aria-label="Giorno della sessione"
                    autoFocus
                    className={`${inputBase} w-[120px] px-3 py-1 font-display text-sm`}
                  />
                  <input
                    type="time"
                    value={tempTime}
                    onChange={(event) => setTempTime(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') submitSchedule();
                      if (event.key === 'Escape') setEditingSchedule(false);
                    }}
                    aria-label="Orario della sessione"
                    className={`${inputBase} w-[110px] px-3 py-1 font-display text-sm`}
                  />
                  <IconButton
                    label="Salva programmazione"
                    tone="positive"
                    onClick={submitSchedule}
                  >
                    <Check className="h-4 w-4" />
                  </IconButton>
                </div>
              ) : (
                <>
                  <span className="text-base text-slate-400 sm:text-lg">
                    {scheduleDay || scheduleTime ? (
                      [scheduleDay, scheduleTime].filter(Boolean).join(' - ')
                    ) : (
                      <span className="text-sm italic text-slate-500">Imposta orario</span>
                    )}
                  </span>
                  <span className="touch-visible opacity-0 transition-opacity duration-200 group-hover/schedule:opacity-100 group-focus-within/schedule:opacity-100">
                    <IconButton
                      label="Modifica programmazione"
                      tone="accent"
                      onClick={() => {
                        setTempDay(scheduleDay);
                        setTempTime(scheduleTime);
                        setEditingSchedule(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </IconButton>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
            <NotesPanel
              label="Appunti Master (Privati)"
              value={notes}
              onChange={(text) => dispatch({ type: 'SET_NOTES', text })}
              placeholder="Scrivi qui i tuoi appunti privati della sessione..."
            />
            <NotesPanel
              label="Appunti Campagna (Pubblici)"
              value={campaignNotes}
              onChange={(text) => dispatch({ type: 'SET_CAMPAIGN_NOTES', text })}
              placeholder="Scrivi qui gli appunti visibili ai giocatori nella schermata condivisa..."
            />
          </div>
        </div>

        <div className="flex flex-col lg:col-span-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-slate-200">
              <Users className="h-4 w-4 text-theme-500" />
              Partecipanti ({players.length})
            </h3>
            <span className="font-mono text-[11px] italic text-slate-500">
              Trascina o usa le frecce
            </span>
          </div>

          <form onSubmit={addPlayer} className="mb-3 flex gap-2">
            <input
              type="text"
              placeholder="Nome nuovo giocatore..."
              value={newPlayerName}
              onChange={(event) => setNewPlayerName(event.target.value)}
              maxLength={40}
              aria-label="Nome del nuovo giocatore"
              className={`${inputBase} min-w-0 flex-grow px-3 py-2 text-sm placeholder-slate-500`}
            />
            <button
              type="submit"
              disabled={!newPlayerName.trim()}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-theme-500 bg-theme-600 px-3 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-theme-500 disabled:opacity-40 disabled:hover:bg-theme-600"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span className="hidden sm:inline">Aggiungi</span>
            </button>
          </form>

          {/* `overflow-x-hidden` è necessario: con `overflow-y: auto` il CSS
              porta anche l'asse orizzontale ad `auto`, e bastava un pixel di
              troppo per far comparire una barra di scorrimento inutile. */}
          <div className="max-h-56 space-y-1.5 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin">
            {players.length === 0 ? (
              <p className="rounded-lg border border-dashed border-bento-border bg-bento-bg px-3 py-4 text-center text-xs italic text-slate-500">
                Nessun giocatore. Aggiungine uno sopra per iniziare.
              </p>
            ) : (
              players.map((player, index) => {
                const isDragged = index === draggedIndex;
                const isOver = index === dragOverIndex;
                const isTurn = activePlayerId === player.id;

                return (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(event) => handleDragStart(event, index)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (draggedIndex !== null && draggedIndex !== index) setDragOverIndex(index);
                    }}
                    onDrop={(event) => handleDrop(event, index)}
                    onDragEnd={() => {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    className={`group/player flex items-center justify-between gap-2 rounded-lg border px-2 py-2 text-sm transition-colors duration-200 ${
                      isDragged
                        ? 'scale-95 border-dashed border-bento-border bg-bento-button/20 opacity-30'
                        : isOver
                          ? 'border-theme-500 bg-theme-500/5'
                          : 'border-bento-border bg-bento-bg hover:border-slate-600 hover:bg-bento-button'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <GripVertical
                        className="hidden h-4 w-4 shrink-0 cursor-grab text-slate-600 active:cursor-grabbing sm:block"
                        aria-hidden
                      />

                      <button
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: 'SET_ACTIVE_PLAYER',
                            id: isTurn ? null : player.id,
                          })
                        }
                        aria-pressed={isTurn}
                        aria-label={
                          isTurn
                            ? `${player.name} è il giocatore attivo. Clicca per disattivare`
                            : `Segna ${player.name} come turno attivo`
                        }
                        className={`shrink-0 rounded-full p-1 transition-colors duration-200 ${
                          isTurn
                            ? 'scale-110 bg-theme-500/10 text-theme-500'
                            : 'text-slate-600 hover:bg-bento-button hover:text-theme-400'
                        }`}
                      >
                        <Star className={`h-4 w-4 ${isTurn ? 'fill-theme-500' : ''}`} />
                      </button>

                      <span
                        className={`min-w-0 truncate font-medium transition-colors duration-200 ${
                          isTurn ? 'font-bold text-theme-400' : 'text-slate-200'
                        }`}
                      >
                        {player.name}
                      </span>
                    </div>

                    <div className="touch-visible flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover/player:opacity-100 group-focus-within/player:opacity-100">
                      <IconButton
                        label={`Sposta ${player.name} in alto`}
                        onClick={() => move(index, index - 1)}
                        disabled={index === 0}
                        className="disabled:opacity-25"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        label={`Sposta ${player.name} in basso`}
                        onClick={() => move(index, index + 1)}
                        disabled={index === players.length - 1}
                        className="disabled:opacity-25"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        label={`Rimuovi ${player.name}`}
                        tone="danger"
                        onClick={() => removePlayer(player, index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
