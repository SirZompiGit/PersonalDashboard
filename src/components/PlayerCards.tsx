/**
 * Schede dei giocatori: inventario e bonus.
 *
 * Le due sezioni erano copiate quasi carattere per carattere, un centinaio di
 * righe ciascuna: ora sono un solo componente parametrico.
 * I controlli di modifica ed eliminazione, prima visibili solo al passaggio del
 * mouse, restano raggiungibili su touch.
 */

import { useState } from 'react';
import type { BonusItem, InventoryItem, Player } from '../types';
import type { CampaignAction } from '../state/campaignReducer';
import { Backpack, Check, Edit2, Plus, Sparkles, Trash2, Users, X } from 'lucide-react';
import { EmptyState } from './ui/EmptyState';
import { IconButton } from './ui/IconButton';
import { StatBlock } from './StatBlock';
import { useToasts } from '../hooks/useToasts';
import { newId } from '../lib/ids';

type Section = 'inventory' | 'bonus';

interface PlayerCardsProps {
  players: Player[];
  activePlayerId: string | null;
  dispatch: React.Dispatch<CampaignAction>;
  statsEnabled: boolean;
  statLabels: string[];
  /** In multiplayer: il master può passare la modifica delle schede ai giocatori. */
  canGrantControl: boolean;
  playersCanEdit: boolean;
  onPlayersCanEditChange: (enabled: boolean) => void;
}

interface ItemSectionProps {
  player: Player;
  section: Section;
  title: string;
  placeholder: string;
  emptyText: string;
  accent: boolean;
  dispatch: React.Dispatch<CampaignAction>;
  onDeleted: (message: string, undo: () => void) => void;
}

function ItemSection({
  player,
  section,
  title,
  placeholder,
  emptyText,
  accent,
  dispatch,
  onDeleted,
}: ItemSectionProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const items: (InventoryItem | BonusItem)[] = player[section];

  const commit = (next: (InventoryItem | BonusItem)[]) =>
    dispatch({ type: 'UPDATE_PLAYER', id: player.id, changes: { [section]: next } });

  const addItem = () => {
    const name = draft.trim();
    if (!name) return;
    commit([...items, { id: newId(), name }]);
    setDraft('');
    setAdding(false);
  };

  const removeItem = (item: InventoryItem | BonusItem) => {
    const previous = items;
    commit(items.filter((i) => i.id !== item.id));
    onDeleted(`"${item.name}" rimosso.`, () => commit(previous));
  };

  const saveEdit = (item: InventoryItem | BonusItem) => {
    const name = editingText.trim();
    if (name) commit(items.map((i) => (i.id === item.id ? { ...i, name } : i)));
    setEditingId(null);
  };

  return (
    <div className={`space-y-2 ${section === 'bonus' ? 'border-t border-bento-border pt-4' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
          {title} ({items.length})
        </span>
        <IconButton
          label={adding ? 'Annulla aggiunta' : `Aggiungi a ${title}`}
          tone="accent"
          onClick={() => {
            setAdding((v) => !v);
            setDraft('');
          }}
        >
          {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </IconButton>
      </div>

      {adding && (
        <div className="flex gap-1.5 animate-fade-in">
          <input
            type="text"
            placeholder={placeholder}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addItem();
              if (event.key === 'Escape') setAdding(false);
            }}
            autoFocus
            maxLength={80}
            aria-label={placeholder}
            className="min-w-0 flex-grow rounded border border-bento-border bg-bento-bg px-2.5 py-1 text-xs text-slate-100 transition-colors duration-200 focus:border-theme-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!draft.trim()}
            className="shrink-0 rounded border border-theme-500 bg-theme-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors duration-200 hover:bg-theme-500 disabled:opacity-40"
          >
            Salva
          </button>
        </div>
      )}

      <div className="max-h-40 space-y-1 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin">
        {items.length === 0 ? (
          <p className="text-[11px] italic text-slate-600">{emptyText}</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="group/item flex items-center justify-between gap-2 rounded border border-bento-border bg-bento-bg px-2.5 py-1.5 text-xs transition-colors duration-200 hover:border-slate-600"
            >
              {editingId === item.id ? (
                <div className="flex w-full items-center gap-1">
                  <input
                    type="text"
                    value={editingText}
                    onChange={(event) => setEditingText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') saveEdit(item);
                      if (event.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    maxLength={80}
                    aria-label={`Modifica ${item.name}`}
                    className="w-full min-w-0 rounded border border-theme-500/50 bg-bento-panel px-1.5 py-0.5 font-mono text-xs text-slate-100 focus:outline-none"
                  />
                  <IconButton label="Salva" tone="positive" onClick={() => saveEdit(item)}>
                    <Check className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              ) : (
                <>
                  <span
                    className={`min-w-0 truncate pr-2 font-mono ${
                      accent ? 'text-theme-400' : 'text-slate-300'
                    }`}
                  >
                    {item.name}
                  </span>
                  <div className="touch-visible flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover/item:opacity-100 group-focus-within/item:opacity-100">
                    <IconButton
                      label={`Modifica ${item.name}`}
                      tone="accent"
                      onClick={() => {
                        setEditingId(item.id);
                        setEditingText(item.name);
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </IconButton>
                    <IconButton
                      label={`Elimina ${item.name}`}
                      tone="danger"
                      onClick={() => removeItem(item)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </IconButton>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function PlayerCards({
  players,
  activePlayerId,
  dispatch,
  statsEnabled,
  statLabels,
  canGrantControl,
  playersCanEdit,
  onPlayersCanEditChange,
}: PlayerCardsProps) {
  const { notifyUndo } = useToasts();

  return (
    <section>
      <div className="mb-5 flex items-center gap-3">
        <h2 className="font-display text-base font-semibold uppercase tracking-wider text-slate-200">
          Schede dei Giocatori
        </h2>
        <span className="h-px flex-grow bg-bento-border" />

        {/* Lo zaino illuminato passa ai giocatori la modifica di inventario e
            statistiche. Solo in multiplayer: in Lite non c'è nessuno a cui
            passarla. */}
        {canGrantControl && (
          <IconButton
            label={
              playersCanEdit
                ? 'I giocatori possono modificare la propria scheda — clicca per riprendere il controllo'
                : 'Passa ai giocatori la modifica della propria scheda'
            }
            tip="left"
            active={playersCanEdit}
            onClick={() => onPlayersCanEditChange(!playersCanEdit)}
            aria-pressed={playersCanEdit}
            className={playersCanEdit ? 'text-theme-400' : ''}
          >
            <Backpack className="h-4 w-4" />
          </IconButton>
        )}
      </div>

      {players.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nessun giocatore"
          hint="Aggiungi i partecipanti nell'intestazione in alto per vedere qui le loro schede."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {players.map((player) => {
            const isActive = activePlayerId === player.id;
            return (
              <article
                key={player.id}
                className={`relative flex flex-col overflow-hidden rounded-xl border bg-bento-panel p-4 shadow-panel transition-colors duration-200 sm:p-5 ${
                  isActive
                    ? 'border-theme-500 ring-1 ring-theme-500/20'
                    : 'border-bento-border hover:border-slate-600'
                }`}
              >
                <span
                  className={`absolute inset-y-0 left-0 w-1.5 ${
                    isActive ? 'bg-theme-600' : 'bg-theme-500/5'
                  }`}
                />

                <div className="mb-4 flex items-center justify-between gap-2 border-b border-bento-border pb-3 pl-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="truncate font-display text-base font-extrabold tracking-wide text-slate-100">
                      {player.name}
                    </h3>
                    {isActive && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-theme-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-theme-500">
                        <Sparkles className="h-2.5 w-2.5" /> Turno
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full border border-bento-border bg-bento-bg p-1 text-slate-500">
                    <Backpack className="h-3.5 w-3.5" />
                  </span>
                </div>

                <div className="flex-grow space-y-5 pl-2">
                  {statsEnabled && (
                    <div className="space-y-2">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                        Statistiche
                      </span>
                      <StatBlock
                        labels={statLabels}
                        stats={player.stats}
                        onChange={(next) =>
                          dispatch({
                            type: 'UPDATE_PLAYER',
                            id: player.id,
                            changes: { stats: next },
                          })
                        }
                      />
                    </div>
                  )}

                  <ItemSection
                    player={player}
                    section="inventory"
                    title="Inventario"
                    placeholder="Nuovo oggetto..."
                    emptyText="Inventario vuoto."
                    accent={false}
                    dispatch={dispatch}
                    onDeleted={notifyUndo}
                  />
                  <ItemSection
                    player={player}
                    section="bonus"
                    title="Bonus / Attributi"
                    placeholder="Nuovo bonus (es. +2 Iniziativa)..."
                    emptyText="Nessun bonus registrato."
                    accent
                    dispatch={dispatch}
                    onDeleted={notifyUndo}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
