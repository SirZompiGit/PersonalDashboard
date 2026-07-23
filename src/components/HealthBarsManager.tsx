/**
 * Gestore delle barre della vita.
 *
 * Interventi principali:
 *  - `getBarColor` e il raggruppamento non sono più copiati qui e in SharedView:
 *    vivono in `lib/healthBars`.
 *  - Il valore massimo è limitato e l'input è numerico. Prima era `type="text"`,
 *    quindi gli attributi `min`/`max` non venivano applicati e digitare 100000
 *    creava centomila elementi nel DOM.
 *  - I suoni non partono più da qui: li gestisce la singola barra. Prima ogni
 *    variazione di HP produceva due suoni sovrapposti.
 *  - Le cancellazioni si possono annullare.
 *  - Il form di modifica vive in `HealthBarForm`: qui restano l'elenco e i
 *    gruppi, che sono un'altra cosa.
 */

import { useState } from 'react';
import type { HealthBar } from '../types';
import type { CampaignAction } from '../state/campaignReducer';
import {
  Check,
  ChevronRight,
  Edit2,
  Folder,
  Heart,
  Plus,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { HealthBarItem } from './HealthBarItem';
import { HealthBarForm } from './HealthBarForm';
import { ConfirmInline } from './ui/ConfirmInline';
import { EmptyState } from './ui/EmptyState';
import { IconButton } from './ui/IconButton';
import { FIELD_SM } from './ui/fields';
import { useToasts } from '../hooks/useToasts';
import { usePersistentSet } from '../hooks/usePersistentState';
import { groupBars } from '../lib/healthBars';

interface HealthBarsManagerProps {
  healthBars: HealthBar[];
  healthGroups: string[];
  dispatch: React.Dispatch<CampaignAction>;
}

export function HealthBarsManager({
  healthBars,
  healthGroups,
  dispatch,
}: HealthBarsManagerProps) {
  const { notifyUndo } = useToasts();

  // Con venti mostri a schermo, poter chiudere un gruppo è la differenza fra
  // trovare la barra giusta e cercarla. La scelta viene ricordata.
  const collapsed = usePersistentSet('fantasia_collapsed_groups');

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Trascinamento per il riordino delle barre. La barra trascinata e quella
  // sotto il puntatore bastano: il reducer sposta solo dentro il gruppo.
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [managingGroups, setManagingGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [tempGroupName, setTempGroupName] = useState('');
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);

  const { groups, ungrouped } = groupBars(healthBars, healthGroups);
  const editingBar = editingId ? (healthBars.find((b) => b.id === editingId) ?? null) : null;
  const isFormOpen = isAdding || editingBar !== null;

  const closeForm = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  /** L'indice serve a rimettere la barra esattamente dov'era. */
  const handleDeleteBar = (bar: HealthBar) => {
    const index = healthBars.findIndex((b) => b.id === bar.id);
    if (editingId === bar.id) closeForm();
    dispatch({ type: 'DELETE_HEALTH_BAR', id: bar.id });
    notifyUndo(`"${bar.name}" eliminata.`, () =>
      dispatch({ type: 'INSERT_HEALTH_BAR', bar, index }),
    );
  };

  const handleDeleteGroup = (group: string) => {
    const index = healthGroups.indexOf(group);
    const barIds = healthBars.filter((b) => b.group === group).map((b) => b.id);
    dispatch({ type: 'DELETE_GROUP', group });
    setDeletingGroup(null);
    notifyUndo(`Gruppo "${group}" eliminato.`, () =>
      dispatch({ type: 'RESTORE_GROUP', group, index, barIds }),
    );
  };

  const endDrag = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  /** `siblings` sono le barre della stessa sezione: il riordino resta lì dentro. */
  const renderBar = (bar: HealthBar, siblings: HealthBar[], index: number) => (
    <HealthBarItem
      key={bar.id}
      bar={bar}
      onChangeValue={(target, value) =>
        dispatch({ type: 'UPDATE_HEALTH_BAR', id: target.id, changes: { currentValue: value } })
      }
      onChangeResource={(target, resource, value) =>
        dispatch({
          type: 'SET_RESOURCE_VALUE',
          barId: target.id,
          resourceId: resource.id,
          value,
        })
      }
      onEdit={(target) => {
        setIsAdding(false);
        setEditingId(target.id);
      }}
      onDelete={handleDeleteBar}
      reorder={{
        onMoveUp: () => dispatch({ type: 'MOVE_HEALTH_BAR', id: bar.id, direction: 'up' }),
        onMoveDown: () => dispatch({ type: 'MOVE_HEALTH_BAR', id: bar.id, direction: 'down' }),
        canMoveUp: index > 0,
        canMoveDown: index < siblings.length - 1,
        onDragStart: () => setDraggedId(bar.id),
        // Evidenzia solo se la barra trascinata appartiene a questa sezione:
        // un rilascio fra gruppi il reducer lo ignora comunque.
        onDragEnter: () => {
          if (draggedId && draggedId !== bar.id && siblings.some((b) => b.id === draggedId)) {
            setDragOverId(bar.id);
          }
        },
        onDragEnd: endDrag,
        onDrop: () => {
          if (draggedId && draggedId !== bar.id) {
            dispatch({ type: 'REORDER_HEALTH_BAR', id: draggedId, toId: bar.id });
          }
          endDrag();
        },
        dragging: draggedId === bar.id,
        dragOver: dragOverId === bar.id,
      }}
    />
  );

  return (
    <section className="rounded-xl border border-bento-border bg-bento-panel p-4 shadow-panel sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold uppercase tracking-wider text-theme-500">
          <Heart className="h-5 w-5 animate-pulse" />
          Barre della Vita
        </h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setManagingGroups((v) => !v)}
            aria-expanded={managingGroups}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors duration-200 ${
              managingGroups
                ? 'border-theme-500/40 bg-bento-button text-theme-400'
                : 'border-bento-border bg-bento-bg text-slate-300 hover:bg-bento-button'
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Gruppi
          </button>

          {!isFormOpen && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setIsAdding(true);
              }}
              className="flex items-center gap-1 rounded-lg border border-bento-border bg-bento-panel px-3 py-1.5 text-xs font-semibold text-theme-500 shadow-panel transition-colors duration-200 hover:border-slate-600 hover:text-theme-400"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuova Barra
            </button>
          )}
        </div>
      </div>

      {managingGroups && (
        <div className="mb-5 space-y-4 rounded-xl border border-bento-border bg-bento-bg p-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-bento-border pb-2">
            <h3 className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-theme-500">
              <Folder className="h-3.5 w-3.5" /> Gestione Gruppi
            </h3>
            <IconButton
              label="Chiudi gestione gruppi"
              onClick={() => {
                setManagingGroups(false);
                setEditingGroup(null);
                setDeletingGroup(null);
              }}
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nome nuovo gruppo..."
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                if (newGroupName.trim()) {
                  dispatch({ type: 'ADD_GROUP', group: newGroupName });
                  setNewGroupName('');
                }
              }}
              maxLength={20}
              className={`${FIELD_SM} flex-grow`}
              aria-label="Nome del nuovo gruppo"
            />
            <button
              type="button"
              onClick={() => {
                if (!newGroupName.trim()) return;
                dispatch({ type: 'ADD_GROUP', group: newGroupName });
                setNewGroupName('');
              }}
              disabled={!newGroupName.trim()}
              className="shrink-0 rounded-lg bg-theme-600 px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-theme-500 disabled:opacity-40"
            >
              Aggiungi
            </button>
          </div>

          <div className="max-h-40 space-y-1.5 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin">
            {healthGroups.length === 0 ? (
              <p className="py-2 text-center text-[11px] italic text-slate-600">
                Nessun gruppo personalizzato.
              </p>
            ) : (
              healthGroups.map((group) => (
                <div
                  key={group}
                  className="flex items-center justify-between gap-2 rounded-lg border border-bento-border bg-bento-panel/40 px-3 py-2 text-xs"
                >
                  {deletingGroup === group ? (
                    <ConfirmInline
                      question={`Eliminare "${group}"?`}
                      onConfirm={() => handleDeleteGroup(group)}
                      onCancel={() => setDeletingGroup(null)}
                    />
                  ) : editingGroup === group ? (
                    <div className="flex flex-grow items-center gap-1.5">
                      <input
                        type="text"
                        value={tempGroupName}
                        onChange={(event) => setTempGroupName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            dispatch({ type: 'RENAME_GROUP', from: group, to: tempGroupName });
                            setEditingGroup(null);
                          }
                          if (event.key === 'Escape') setEditingGroup(null);
                        }}
                        maxLength={20}
                        autoFocus
                        aria-label={`Nuovo nome per ${group}`}
                        className="flex-grow rounded border border-bento-border bg-bento-panel px-2 py-1 text-xs text-slate-100 focus:border-theme-500 focus:outline-none"
                      />
                      <IconButton
                        label="Conferma nome"
                        tone="positive"
                        onClick={() => {
                          dispatch({ type: 'RENAME_GROUP', from: group, to: tempGroupName });
                          setEditingGroup(null);
                        }}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton label="Annulla" onClick={() => setEditingGroup(null)}>
                        <X className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  ) : (
                    <>
                      <span className="truncate font-medium text-slate-200">{group}</span>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <IconButton
                          label={`Rinomina ${group}`}
                          tone="accent"
                          onClick={() => {
                            setEditingGroup(group);
                            setTempGroupName(group);
                            setDeletingGroup(null);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </IconButton>
                        <IconButton
                          label={`Elimina ${group}`}
                          tone="danger"
                          onClick={() => {
                            setDeletingGroup(group);
                            setEditingGroup(null);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isFormOpen && (
        <HealthBarForm
          // Passando da una barra all'altra il form si rimonta con i valori
          // giusti, invece di conservare quelli di prima.
          key={editingBar?.id ?? 'new'}
          bar={editingBar}
          healthGroups={healthGroups}
          onCancel={closeForm}
          onSubmit={(payload) => {
            if (editingBar) {
              dispatch({ type: 'UPDATE_HEALTH_BAR', id: editingBar.id, changes: payload });
            } else {
              dispatch({ type: 'ADD_HEALTH_BAR', bar: payload });
            }
            closeForm();
          }}
        />
      )}

      {healthBars.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nessuna barra vita"
          hint="Crea una barra per tracciare la salute di mostri, PNG o alleati durante il combattimento."
        />
      ) : (
        <div className="space-y-6">
          {[
            ...groups,
            ...(ungrouped.length > 0
              ? [{ name: 'Senza Gruppo', bars: ungrouped, key: '__ungrouped__' }]
              : []),
          ].map((group) => {
            const key = 'key' in group ? group.key : group.name;
            const isCollapsed = collapsed.has(key);

            return (
              <div key={key} className="space-y-3">
                <button
                  type="button"
                  onClick={() => collapsed.toggle(key)}
                  aria-expanded={!isCollapsed}
                  className="group/head flex w-full items-center gap-2 border-b border-bento-border/30 pb-1 text-left transition-colors duration-200 hover:border-bento-border"
                >
                  <ChevronRight
                    className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-200 group-hover/head:text-slate-300 ${
                      isCollapsed ? '' : 'rotate-90'
                    }`}
                  />
                  <span className="rounded border border-bento-border/40 bg-bento-bg px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {group.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    ({group.bars.length})
                  </span>
                  {isCollapsed && (
                    <span className="ml-auto font-mono text-[10px] text-slate-600">
                      nascosto
                    </span>
                  )}
                </button>

                {!isCollapsed && (
                  <div className="space-y-3">
                    {group.bars.map((bar, index) => renderBar(bar, group.bars, index))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
