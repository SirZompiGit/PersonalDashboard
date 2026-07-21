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
 */

import { type FormEvent, useState } from 'react';
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
import { ConfirmInline } from './ui/ConfirmInline';
import { EmptyState } from './ui/EmptyState';
import { IconButton } from './ui/IconButton';
import { useToasts } from '../hooks/useToasts';
import { usePersistentSet } from '../hooks/usePersistentState';
import {
  DEFAULT_ZERO_HP_TEXT,
  MAX_HP,
  MIN_HP,
  clampMaxHp,
  getBarColor,
  groupBars,
} from '../lib/healthBars';

interface HealthBarsManagerProps {
  healthBars: HealthBar[];
  healthGroups: string[];
  dispatch: React.Dispatch<CampaignAction>;
}

const PRESET_COLORS = [
  { name: 'Smeraldo', hex: '#10b981' },
  { name: 'Cremisi', hex: '#ef4444' },
  { name: 'Ambra', hex: '#f59e0b' },
  { name: 'Zaffiro', hex: '#3b82f6' },
  { name: 'Ametista', hex: '#a855f7' },
  { name: 'Oceano', hex: '#06b6d4' },
];

const FIELD =
  'w-full rounded-lg border border-bento-border bg-bento-panel px-3 py-2 text-sm text-slate-100 transition-colors duration-200 focus:border-theme-500 focus:outline-none focus:ring-1 focus:ring-theme-500/20';

interface FormValues {
  name: string;
  maxValue: string;
  currentValue: string;
  colorMode: HealthBar['colorMode'];
  staticColor: string;
  low: string;
  mid: string;
  high: string;
  group: string;
  zeroHpText: string;
  lowHpAlert: boolean;
}

const EMPTY_FORM: FormValues = {
  name: '',
  maxValue: '20',
  currentValue: '20',
  colorMode: 'static',
  staticColor: '#10b981',
  low: '#ef4444',
  mid: '#f59e0b',
  high: '#10b981',
  group: '',
  zeroHpText: DEFAULT_ZERO_HP_TEXT,
  lowHpAlert: true,
};

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
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);

  const [managingGroups, setManagingGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [tempGroupName, setTempGroupName] = useState('');
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);

  const { groups, ungrouped } = groupBars(healthBars, healthGroups);
  const isFormOpen = isAdding || editingId !== null;

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const closeForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (bar: HealthBar) => {
    setIsAdding(false);
    setEditingId(bar.id);
    setForm({
      name: bar.name,
      maxValue: String(bar.maxValue),
      currentValue: String(bar.currentValue),
      colorMode: bar.colorMode,
      staticColor: bar.staticColor,
      low: bar.gradientColors.low,
      mid: bar.gradientColors.mid,
      high: bar.gradientColors.high,
      group: bar.group ?? '',
      zeroHpText: bar.zeroHpText ?? DEFAULT_ZERO_HP_TEXT,
      lowHpAlert: bar.lowHpAlert !== false,
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return;

    // I campi numerici restano stringhe mentre si scrive, così è possibile
    // svuotarli; il limite si applica qui, una volta sola.
    const maxValue = clampMaxHp(Number.parseInt(form.maxValue, 10) || MIN_HP);
    const currentValue = Math.max(
      0,
      Math.min(Number.parseInt(form.currentValue, 10) || 0, maxValue),
    );

    const payload = {
      name,
      maxValue,
      currentValue,
      colorMode: form.colorMode,
      staticColor: form.staticColor,
      gradientColors: { low: form.low, mid: form.mid, high: form.high },
      group: form.group || undefined,
      zeroHpText: form.zeroHpText.trim() || DEFAULT_ZERO_HP_TEXT,
      lowHpAlert: form.lowHpAlert,
    };

    if (editingId) dispatch({ type: 'UPDATE_HEALTH_BAR', id: editingId, changes: payload });
    else dispatch({ type: 'ADD_HEALTH_BAR', bar: payload });

    closeForm();
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

  const renderBar = (bar: HealthBar) => (
    <HealthBarItem
      key={bar.id}
      bar={bar}
      getBarColor={getBarColor}
      onChangeValue={(target, value) =>
        dispatch({ type: 'UPDATE_HEALTH_BAR', id: target.id, changes: { currentValue: value } })
      }
      onEdit={startEdit}
      onDelete={handleDeleteBar}
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
                setForm(EMPTY_FORM);
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
              className={`${FIELD} flex-grow text-xs`}
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
        <form
          onSubmit={handleSubmit}
          className="mb-5 space-y-4 rounded-xl border border-bento-border bg-bento-bg p-4 sm:p-5"
        >
          <div className="flex items-center justify-between border-b border-bento-border pb-2">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-theme-500">
              {editingId ? 'Modifica Barra Vita' : 'Crea Nuova Barra Vita'}
            </h3>
            <IconButton label="Chiudi" onClick={closeForm}>
              <X className="h-4 w-4" />
            </IconButton>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-400">
                Nome (es. Goblin, Boss, Guerriero)
              </span>
              <input
                type="text"
                placeholder="Nome bersaglio..."
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                maxLength={60}
                required
                autoFocus
                className={FIELD}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-400">Gruppo</span>
              <select
                value={form.group}
                onChange={(event) => setField('group', event.target.value)}
                className={`${FIELD} font-sans`}
              >
                <option value="">Nessun Gruppo</option>
                {healthGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-medium text-slate-400">Testo a 0 HP</span>
              <input
                type="text"
                placeholder={DEFAULT_ZERO_HP_TEXT}
                value={form.zeroHpText}
                onChange={(event) => setField('zeroHpText', event.target.value)}
                maxLength={20}
                className={`${FIELD} font-mono uppercase tracking-wider`}
              />
            </label>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-bento-border bg-bento-panel px-3 py-2.5 select-none md:col-span-2">
              <input
                type="checkbox"
                checked={form.lowHpAlert}
                onChange={(event) => setField('lowHpAlert', event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-theme-500"
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-slate-200">
                  Allerta sotto il 25%
                </span>
                <span className="block text-[11px] leading-snug text-slate-500">
                  La barra pulsa quando i punti ferita scendono sotto un quarto. Si spegne da
                  sola a 0 HP, dove compare già l&apos;etichetta.
                </span>
              </span>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-400">
                Valore Massimo (max {MAX_HP})
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={MIN_HP}
                max={MAX_HP}
                value={form.maxValue}
                onChange={(event) => setField('maxValue', event.target.value)}
                onBlur={() =>
                  setField('maxValue', String(clampMaxHp(Number.parseInt(form.maxValue, 10) || MIN_HP)))
                }
                className={`${FIELD} font-mono`}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-400">Valore Attuale</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={clampMaxHp(Number.parseInt(form.maxValue, 10) || MIN_HP)}
                value={form.currentValue}
                onChange={(event) => setField('currentValue', event.target.value)}
                className={`${FIELD} font-mono`}
              />
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1 block text-xs font-medium text-slate-400">
              Modalità Colore
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
              {(
                [
                  { id: 'static', label: 'Colore singolo', hint: 'Sempre lo stesso' },
                  { id: 'gradient', label: 'A 3 livelli', hint: 'Scatti netti alle soglie' },
                  { id: 'smooth', label: 'Sfumato', hint: 'Passaggio graduale' },
                ] as const
              ).map(({ id, label, hint }) => (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-2 text-xs text-slate-300 select-none"
                  title={hint}
                >
                  <input
                    type="radio"
                    name="colorMode"
                    checked={form.colorMode === id}
                    onChange={() => setField('colorMode', id)}
                    className="accent-theme-500"
                  />
                  {label}
                  <span className="text-slate-600">— {hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {form.colorMode === 'static' ? (
            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-400">
                Scegli Colore Statico
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setField('staticColor', preset.hex)}
                    style={{ backgroundColor: preset.hex }}
                    aria-label={preset.name}
                    aria-pressed={form.staticColor === preset.hex}
                    className={`h-7 w-7 rounded-full border-2 transition-transform duration-200 ${
                      form.staticColor === preset.hex
                        ? 'scale-110 border-white shadow-raised'
                        : 'border-transparent hover:scale-105'
                    }`}
                  />
                ))}
                <label className="ml-1 flex items-center gap-1.5 rounded-lg border border-bento-border bg-bento-panel px-2 py-1">
                  <span className="font-mono text-[10px] text-slate-400">Custom</span>
                  <input
                    type="color"
                    value={form.staticColor}
                    onChange={(event) => setField('staticColor', event.target.value)}
                    aria-label="Colore personalizzato"
                    className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-bento-border bg-bento-panel p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                  Colori della salute
                </span>

                {/* Anteprima: mostra subito la differenza fra gradini e sfumatura. */}
                <span
                  className="h-2.5 w-32 rounded-full border border-bento-border"
                  style={{
                    background:
                      form.colorMode === 'smooth'
                        ? `linear-gradient(to right, ${form.low}, ${form.mid}, ${form.high})`
                        : `linear-gradient(to right, ${form.low} 0 33%, ${form.mid} 33% 66%, ${form.high} 66% 100%)`,
                  }}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(
                  [
                    {
                      key: 'low',
                      label: form.colorMode === 'smooth' ? 'A 0%' : 'Basso (≤ 33%)',
                      tone: 'text-red-400',
                    },
                    {
                      key: 'mid',
                      label: form.colorMode === 'smooth' ? 'A 50%' : 'Medio (34-66%)',
                      tone: 'text-amber-400',
                    },
                    {
                      key: 'high',
                      label: form.colorMode === 'smooth' ? 'A 100%' : 'Alto (≥ 67%)',
                      tone: 'text-emerald-400',
                    },
                  ] as const
                ).map(({ key, label, tone }) => (
                  <label key={key} className="space-y-1">
                    <span className={`block text-[10px] font-semibold ${tone}`}>{label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form[key]}
                        onChange={(event) => setField(key, event.target.value)}
                        className="h-7 w-7 cursor-pointer rounded border border-bento-border bg-transparent"
                      />
                      <span className="font-mono text-[10px] text-slate-400">{form[key]}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-bento-border pt-3">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-bento-border bg-bento-button px-4 py-2 text-xs font-medium text-slate-300 transition-colors duration-200 hover:bg-bento-border"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="rounded-lg border border-theme-500 bg-theme-600 px-4 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-theme-500"
            >
              {editingId ? 'Aggiorna Barra' : 'Crea Barra'}
            </button>
          </div>
        </form>
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

                {!isCollapsed && <div className="space-y-3">{group.bars.map(renderBar)}</div>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
