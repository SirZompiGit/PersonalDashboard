/**
 * Scheda personale del giocatore, nella vista multiplayer.
 *
 * Sempre visibile — non solo quando è il proprio turno — a differenza del
 * pannello dei turni nella condivisione. In sola lettura riflette la campagna
 * del master; quando il master passa il controllo (`editable`) diventa
 * modificabile e ogni cambiamento viene scritto come **snapshot completo** sul
 * nodo dell'utente, che il master fonde nella campagna.
 *
 * Rimonta (via `key` nel chiamante) quando cambia il personaggio o lo stato di
 * modifica: così la bozza riparte sempre dai dati più recenti del master.
 */

import { useEffect, useRef, useState } from 'react';
import type { BonusItem, InventoryItem, Player } from '../types';
import type { PlayerSheet } from '../firebaseUtils';
import { Backpack, Plus, Sparkles, X } from 'lucide-react';
import { StatBlock } from './StatBlock';
import { newId } from '../lib/ids';
import { readStats } from '../lib/stats';

const SAVE_DELAY = 500;

interface PlayerSheetPanelProps {
  player: Player;
  statsEnabled: boolean;
  statLabels: string[];
  editable: boolean;
  onSave: (sheet: PlayerSheet) => void;
}

export function PlayerSheetPanel({
  player,
  statsEnabled,
  statLabels,
  editable,
  onSave,
}: PlayerSheetPanelProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>(player.inventory);
  const [bonus, setBonus] = useState<BonusItem[]>(player.bonus);
  const [stats, setStats] = useState<number[] | undefined>(player.stats);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRenderRef = useRef(true);

  // La scrittura sul database è ritardata: aggiungere una lettera per volta non
  // deve inondare la stanza. Il primo render non salva (nessuna modifica ancora).
  useEffect(() => {
    if (!editable) return;
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onSave({ inventory, bonus, ...(stats ? { stats } : {}) });
    }, SAVE_DELAY);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [inventory, bonus, stats, editable, onSave]);

  const readOnlyList = (title: string, items: (InventoryItem | BonusItem)[], accent: boolean) => (
    <div className="min-w-0">
      <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </span>
      {items.length === 0 ? (
        <p className="text-[11px] italic text-slate-600">Vuoto.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item.id}
              className={`max-w-full rounded-md border border-bento-border/60 bg-bento-item px-2 py-1 text-[11px] leading-tight font-medium break-words ${
                accent ? 'text-theme-300' : 'text-slate-300'
              }`}
            >
              {item.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  // In sola lettura le statistiche seguono la campagna del master; in modifica
  // seguono la bozza locale.
  const shownStats = editable ? stats : player.stats;

  return (
    <section className="rounded-xl border border-bento-border bg-bento-panel p-3 shadow-panel sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-bento-border pb-2">
        <h2 className="flex min-w-0 items-center gap-2 font-display text-xs font-extrabold uppercase tracking-wider text-slate-300">
          <Backpack className="h-3.5 w-3.5 shrink-0 text-theme-500" />
          <span className="truncate">La tua scheda — {player.name}</span>
        </h2>
        {editable && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-theme-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-theme-400">
            <Sparkles className="h-2.5 w-2.5" /> Modificabile
          </span>
        )}
      </div>

      {/* Su schermi larghi le tre parti stanno affiancate, così la scheda resta
          bassa e non ruba spazio alla vista condivisa. */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 lg:grid-cols-3">
        {statsEnabled && (
          <div className="min-w-0">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Statistiche
            </span>
            {editable ? (
              <StatBlock
                labels={statLabels}
                stats={readStats(shownStats)}
                onChange={setStats}
                dense
              />
            ) : (
              <StatBlock labels={statLabels} stats={shownStats} dense />
            )}
          </div>
        )}

        {editable ? (
          <EditableList
            title="Inventario"
            items={inventory}
            placeholder="Nuovo oggetto..."
            onChange={setInventory}
          />
        ) : (
          readOnlyList('Inventario', player.inventory, false)
        )}

        {editable ? (
          <EditableList
            title="Bonus"
            items={bonus}
            placeholder="Nuovo bonus..."
            onChange={setBonus}
          />
        ) : (
          readOnlyList('Bonus', player.bonus, true)
        )}
      </div>
    </section>
  );
}

/** Lista modificabile compatta: aggiunta con invio, rimozione con la ✕. */
function EditableList({
  title,
  items,
  placeholder,
  onChange,
}: {
  title: string;
  items: (InventoryItem | BonusItem)[];
  placeholder: string;
  onChange: (next: (InventoryItem | BonusItem)[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    onChange([...items, { id: newId(), name: name.slice(0, 80) }]);
    setDraft('');
  };

  return (
    <div className="min-w-0">
      <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </span>

      <div className="mb-1.5 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item.id}
            className="inline-flex max-w-full items-center gap-1 rounded-md border border-bento-border/60 bg-bento-item px-2 py-1 text-[11px] leading-tight font-medium break-words text-slate-300"
          >
            <span className="min-w-0 break-words">{item.name}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((i) => i.id !== item.id))}
              aria-label={`Rimuovi ${item.name}`}
              className="shrink-0 rounded p-0.5 text-slate-500 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-400"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          maxLength={80}
          aria-label={`Aggiungi a ${title}`}
          className="min-w-0 flex-grow rounded border border-bento-border bg-bento-bg px-2 py-1 text-xs text-slate-100 transition-colors duration-200 focus:border-theme-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          aria-label={`Aggiungi a ${title}`}
          className="shrink-0 rounded border border-theme-500 bg-theme-600 px-2 text-white transition-colors duration-200 hover:bg-theme-500 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
