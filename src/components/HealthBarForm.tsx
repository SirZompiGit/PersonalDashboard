/**
 * Form di creazione e modifica di una barra della vita.
 *
 * Era una colonna di undici campi tutti allo stesso peso, e le risorse
 * l'avrebbero triplicata. Qui è riorganizzato per frequenza d'uso:
 *
 *  - **sempre visibile** ciò che si tocca davvero: nome, gruppo, valori, colore
 *    (una riga sola, non più un blocco alto cento pixel);
 *  - **Risorse** e **Opzioni avanzate** sono sezioni richiudibili, e la prima
 *    resta chiusa finché non serve: il costo lo si paga solo usandole.
 *
 * `ColorFields` è lo stesso controllo per la barra principale e per ogni
 * risorsa, quindi tutte hanno le identiche tre modalità di colore senza che il
 * form raddoppi.
 */

import { type FormEvent, useState } from 'react';
import type { ColoredBar, HealthBar, Resource, StatusEffect } from '../types';
import { ChevronRight, Eye, EyeOff, Plus, Trash2, X } from 'lucide-react';
import { IconButton } from './ui/IconButton';
import { FIELD, FIELD_SM } from './ui/fields';
import { newId } from '../lib/ids';
import {
  DEFAULT_RESOURCE_COLOR,
  DEFAULT_STATUS_COLOR,
  DEFAULT_ZERO_HP_TEXT,
  MAX_HP,
  MAX_RESOURCES,
  MAX_STATUS_EFFECTS,
  MIN_HP,
  clampMaxHp,
} from '../lib/healthBars';

const PRESET_COLORS = [
  { name: 'Smeraldo', hex: '#10b981' },
  { name: 'Cremisi', hex: '#ef4444' },
  { name: 'Ambra', hex: '#f59e0b' },
  { name: 'Zaffiro', hex: '#3b82f6' },
  { name: 'Ametista', hex: '#a855f7' },
  { name: 'Oceano', hex: '#06b6d4' },
];

const COLOR_MODES: { id: ColoredBar['colorMode']; label: string }[] = [
  { id: 'static', label: 'Colore singolo' },
  { id: 'gradient', label: 'A 3 livelli' },
  { id: 'smooth', label: 'Sfumato' },
];

/** Etichetta della colonna sinistra: allinea le righe senza tabelle. */
const ROW_LABEL = 'w-16 shrink-0 text-xs font-medium text-slate-400 sm:w-20';

/** Parte colore, comune alla barra della vita e alle risorse. */
interface ColorDraft {
  colorMode: ColoredBar['colorMode'];
  staticColor: string;
  low: string;
  mid: string;
  high: string;
}

interface ResourceDraft extends ColorDraft {
  id: string;
  name: string;
  maxValue: string;
  currentValue: string;
  shared: boolean;
}

interface StatusDraft {
  id: string;
  name: string;
  color: string;
  shared: boolean;
}

interface FormValues extends ColorDraft {
  name: string;
  maxValue: string;
  currentValue: string;
  group: string;
  zeroHpText: string;
  lowHpAlert: boolean;
  resources: ResourceDraft[];
  statusEffects: StatusDraft[];
}

const EMPTY_COLORS: ColorDraft = {
  colorMode: 'static',
  staticColor: '#10b981',
  low: '#ef4444',
  mid: '#f59e0b',
  high: '#10b981',
};

const EMPTY_FORM: FormValues = {
  ...EMPTY_COLORS,
  name: '',
  maxValue: '20',
  currentValue: '20',
  group: '',
  zeroHpText: DEFAULT_ZERO_HP_TEXT,
  lowHpAlert: true,
  resources: [],
  statusEffects: [],
};

const newResourceDraft = (): ResourceDraft => ({
  ...EMPTY_COLORS,
  staticColor: DEFAULT_RESOURCE_COLOR,
  id: newId(),
  name: '',
  maxValue: '10',
  currentValue: '10',
  shared: true,
});

const newStatusDraft = (): StatusDraft => ({
  id: newId(),
  name: '',
  color: DEFAULT_STATUS_COLOR,
  shared: true,
});

/** I campi numerici restano stringhe mentre si scrive, così è possibile svuotarli. */
const readMax = (raw: string) => clampMaxHp(Number.parseInt(raw, 10) || MIN_HP);
const readCurrent = (raw: string, max: number) =>
  Math.max(0, Math.min(Number.parseInt(raw, 10) || 0, max));

function toDraft(bar: HealthBar): FormValues {
  return {
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
    resources: (bar.resources ?? []).map((resource) => ({
      id: resource.id,
      name: resource.name,
      maxValue: String(resource.maxValue),
      currentValue: String(resource.currentValue),
      colorMode: resource.colorMode,
      staticColor: resource.staticColor,
      low: resource.gradientColors.low,
      mid: resource.gradientColors.mid,
      high: resource.gradientColors.high,
      shared: resource.shared,
    })),
    statusEffects: (bar.statusEffects ?? []).map((effect) => ({
      id: effect.id,
      name: effect.name,
      color: effect.color,
      shared: effect.shared,
    })),
  };
}

/**
 * Pastiglia di colore: il selettore nativo è invisibile ma occupa tutta la
 * pastiglia, quindi un clic qualunque lo apre. Costa 28 pixel invece dei tre
 * campi affiancati di prima.
 */
function Swatch({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <span
      className="relative inline-flex h-7 w-7 shrink-0 rounded-full border-2 border-bento-border transition-transform duration-200 hover:scale-110"
      style={{ backgroundColor: value }}
    >
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        title={`${label} — ${value}`}
        className="h-full w-full cursor-pointer opacity-0"
      />
    </span>
  );
}

function ColorFields({
  value,
  onChange,
  withPresets = false,
}: {
  value: ColorDraft;
  onChange: (patch: Partial<ColorDraft>) => void;
  /** Tavolozza rapida: utile sulla barra principale, di troppo su una risorsa. */
  withPresets?: boolean;
}) {
  const isStatic = value.colorMode === 'static';

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <select
        value={value.colorMode}
        onChange={(event) =>
          onChange({ colorMode: event.target.value as ColoredBar['colorMode'] })
        }
        aria-label="Modalità colore"
        className={`${FIELD_SM} font-sans`}
      >
        {COLOR_MODES.map((mode) => (
          <option key={mode.id} value={mode.id}>
            {mode.label}
          </option>
        ))}
      </select>

      {isStatic ? (
        <>
          <Swatch
            value={value.staticColor}
            onChange={(staticColor) => onChange({ staticColor })}
            label="Colore"
          />
          {withPresets && (
            <span className="flex flex-wrap items-center gap-1.5">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => onChange({ staticColor: preset.hex })}
                  style={{ backgroundColor: preset.hex }}
                  aria-label={preset.name}
                  aria-pressed={value.staticColor === preset.hex}
                  className={`h-5 w-5 rounded-full border transition-transform duration-200 ${
                    value.staticColor === preset.hex
                      ? 'scale-110 border-white'
                      : 'border-transparent hover:scale-110'
                  }`}
                />
              ))}
            </span>
          )}
        </>
      ) : (
        <>
          <Swatch value={value.low} onChange={(low) => onChange({ low })} label="Colore basso" />
          <Swatch value={value.mid} onChange={(mid) => onChange({ mid })} label="Colore medio" />
          <Swatch
            value={value.high}
            onChange={(high) => onChange({ high })}
            label="Colore alto"
          />

          {/* Anteprima: mostra subito la differenza fra gradini e sfumatura. */}
          <span
            aria-hidden
            className="h-2.5 w-20 rounded-full border border-bento-border"
            style={{
              background:
                value.colorMode === 'smooth'
                  ? `linear-gradient(to right, ${value.low}, ${value.mid}, ${value.high})`
                  : `linear-gradient(to right, ${value.low} 0 33%, ${value.mid} 33% 66%, ${value.high} 66% 100%)`,
            }}
          />
        </>
      )}
    </div>
  );
}

function SectionToggle({
  title,
  badge,
  open,
  onToggle,
}: {
  title: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="group/head flex w-full items-center gap-2 text-left"
    >
      <ChevronRight
        className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-200 group-hover/head:text-slate-300 ${
          open ? 'rotate-90' : ''
        }`}
      />
      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </span>
      {badge && <span className="font-mono text-[10px] text-slate-600">{badge}</span>}
    </button>
  );
}

interface HealthBarFormProps {
  /** Barra in modifica, oppure `null` per crearne una nuova. */
  bar: HealthBar | null;
  healthGroups: string[];
  onSubmit: (payload: Omit<HealthBar, 'id'>) => void;
  onCancel: () => void;
}

export function HealthBarForm({ bar, healthGroups, onSubmit, onCancel }: HealthBarFormProps) {
  const [form, setForm] = useState<FormValues>(() => (bar ? toDraft(bar) : EMPTY_FORM));
  // Le risorse si aprono da sole quando ce ne sono già: chiuse nasconderebbero
  // proprio ciò che si è venuti a modificare.
  const [showResources, setShowResources] = useState(() => (bar?.resources?.length ?? 0) > 0);
  const [showEffects, setShowEffects] = useState(() => (bar?.statusEffects?.length ?? 0) > 0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedResource, setExpandedResource] = useState<string | null>(null);

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const patchResource = (id: string, patch: Partial<ResourceDraft>) =>
    setForm((current) => ({
      ...current,
      resources: current.resources.map((resource) =>
        resource.id === id ? { ...resource, ...patch } : resource,
      ),
    }));

  const addResource = () => {
    const draft = newResourceDraft();
    setForm((current) =>
      current.resources.length >= MAX_RESOURCES
        ? current
        : { ...current, resources: [...current.resources, draft] },
    );
    setShowResources(true);
    setExpandedResource(draft.id);
  };

  const removeResource = (id: string) => {
    setForm((current) => ({
      ...current,
      resources: current.resources.filter((resource) => resource.id !== id),
    }));
    if (expandedResource === id) setExpandedResource(null);
  };

  const patchEffect = (id: string, patch: Partial<StatusDraft>) =>
    setForm((current) => ({
      ...current,
      statusEffects: current.statusEffects.map((effect) =>
        effect.id === id ? { ...effect, ...patch } : effect,
      ),
    }));

  const addEffect = () => {
    setForm((current) =>
      current.statusEffects.length >= MAX_STATUS_EFFECTS
        ? current
        : { ...current, statusEffects: [...current.statusEffects, newStatusDraft()] },
    );
    setShowEffects(true);
  };

  const removeEffect = (id: string) =>
    setForm((current) => ({
      ...current,
      statusEffects: current.statusEffects.filter((effect) => effect.id !== id),
    }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return;

    const maxValue = readMax(form.maxValue);

    // Una risorsa senza nome non viene scartata in silenzio: ne riceve uno.
    // Bloccare l'invio con un campo obbligatorio dentro una sezione richiusa
    // produrrebbe un errore del browser su un campo che non è nemmeno visibile.
    const resources: Resource[] = form.resources.map((draft, index) => {
      const resourceMax = readMax(draft.maxValue);
      return {
        id: draft.id,
        name: draft.name.trim().slice(0, 30) || `Risorsa ${index + 1}`,
        maxValue: resourceMax,
        currentValue: readCurrent(draft.currentValue, resourceMax),
        colorMode: draft.colorMode,
        staticColor: draft.staticColor,
        gradientColors: { low: draft.low, mid: draft.mid, high: draft.high },
        shared: draft.shared,
      };
    });

    // Un effetto senza nome non blocca l'invio (il campo è in una sezione
    // richiudibile): ne riceve uno generico.
    const statusEffects: StatusEffect[] = form.statusEffects.map((draft, index) => ({
      id: draft.id,
      name: draft.name.trim().slice(0, 24) || `Effetto ${index + 1}`,
      color: draft.color,
      shared: draft.shared,
    }));

    onSubmit({
      name,
      maxValue,
      currentValue: readCurrent(form.currentValue, maxValue),
      colorMode: form.colorMode,
      staticColor: form.staticColor,
      gradientColors: { low: form.low, mid: form.mid, high: form.high },
      group: form.group || undefined,
      zeroHpText: form.zeroHpText.trim() || DEFAULT_ZERO_HP_TEXT,
      lowHpAlert: form.lowHpAlert,
      // Assente quando non ce ne sono: una barra senza risorse deve produrre lo
      // stesso identico payload di prima che le risorse esistessero.
      resources: resources.length > 0 ? resources : undefined,
      statusEffects: statusEffects.length > 0 ? statusEffects : undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-5 space-y-3 rounded-xl border border-bento-border bg-bento-bg p-4 sm:p-5"
    >
      <div className="flex items-center justify-between border-b border-bento-border pb-2">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-theme-500">
          {bar ? 'Modifica Barra Vita' : 'Crea Nuova Barra Vita'}
        </h3>
        <IconButton label="Chiudi" onClick={onCancel}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>

      {/* ------------------------------------------------------ nome e gruppo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex min-w-0 flex-1 items-center gap-2">
          <span className={ROW_LABEL}>Nome</span>
          <input
            type="text"
            placeholder="Goblin, Boss, Guerriero..."
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            maxLength={60}
            required
            autoFocus
            className={`${FIELD} w-full`}
          />
        </label>

        <label className="flex shrink-0 items-center gap-2">
          <select
            value={form.group}
            onChange={(event) => setField('group', event.target.value)}
            aria-label="Gruppo"
            className={`${FIELD} w-full font-sans sm:w-auto`}
          >
            <option value="">Nessun Gruppo</option>
            {healthGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ----------------------------------------------------------- i valori */}
      <div className="flex items-center gap-2">
        <span className={ROW_LABEL}>Valori</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={readMax(form.maxValue)}
          value={form.currentValue}
          onChange={(event) => setField('currentValue', event.target.value)}
          aria-label="Valore attuale"
          className={`${FIELD} w-20 font-mono`}
        />
        <span className="text-slate-600">/</span>
        <input
          type="number"
          inputMode="numeric"
          min={MIN_HP}
          max={MAX_HP}
          value={form.maxValue}
          onChange={(event) => setField('maxValue', event.target.value)}
          onBlur={() => setField('maxValue', String(readMax(form.maxValue)))}
          aria-label="Valore massimo"
          className={`${FIELD} w-20 font-mono`}
        />
        <span className="font-mono text-[10px] text-slate-600">max {MAX_HP}</span>
      </div>

      {/* ----------------------------------------------------------- il colore */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className={ROW_LABEL}>Colore</span>
        <ColorFields
          value={form}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          withPresets
        />
      </div>

      {/* ---------------------------------------------------------- le risorse */}
      <div className="space-y-2 border-t border-bento-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <SectionToggle
            title="Risorse"
            badge={`${form.resources.length}/${MAX_RESOURCES}`}
            open={showResources}
            onToggle={() => setShowResources((v) => !v)}
          />

          {form.resources.length < MAX_RESOURCES && (
            <button
              type="button"
              onClick={addResource}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-bento-border bg-bento-panel px-2 py-1 text-[11px] font-semibold text-theme-500 transition-colors duration-200 hover:border-slate-600 hover:text-theme-400"
            >
              <Plus className="h-3 w-3" />
              Aggiungi
            </button>
          )}
        </div>

        {showResources && (
          <div className="space-y-2 animate-fade-in">
            {form.resources.length === 0 ? (
              <p className="text-[11px] leading-snug text-slate-600">
                Barre più sottili agganciate a questa: mana, scudo, frenesia. Hanno valori e
                colori propri e si trascinano come quella della vita.
              </p>
            ) : (
              form.resources.map((resource, index) => {
                const isOpen = expandedResource === resource.id;

                return (
                  <div
                    key={resource.id}
                    className="rounded-lg border border-bento-border bg-bento-panel/40 p-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="h-4 w-4 shrink-0 rounded-full border border-bento-border"
                        style={{
                          background:
                            resource.colorMode === 'static'
                              ? resource.staticColor
                              : `linear-gradient(135deg, ${resource.low}, ${resource.mid}, ${resource.high})`,
                        }}
                      />

                      <input
                        type="text"
                        placeholder={`Risorsa ${index + 1}`}
                        value={resource.name}
                        onChange={(event) =>
                          patchResource(resource.id, { name: event.target.value })
                        }
                        maxLength={30}
                        aria-label={`Nome della risorsa ${index + 1}`}
                        className={`${FIELD_SM} min-w-0 flex-1`}
                      />

                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={readMax(resource.maxValue)}
                        value={resource.currentValue}
                        onChange={(event) =>
                          patchResource(resource.id, { currentValue: event.target.value })
                        }
                        aria-label={`Valore attuale della risorsa ${index + 1}`}
                        className={`${FIELD_SM} w-14 font-mono`}
                      />
                      <span className="text-[10px] text-slate-600">/</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={MIN_HP}
                        max={MAX_HP}
                        value={resource.maxValue}
                        onChange={(event) =>
                          patchResource(resource.id, { maxValue: event.target.value })
                        }
                        onBlur={() =>
                          patchResource(resource.id, {
                            maxValue: String(readMax(resource.maxValue)),
                          })
                        }
                        aria-label={`Valore massimo della risorsa ${index + 1}`}
                        className={`${FIELD_SM} w-14 font-mono`}
                      />

                      <IconButton
                        label={
                          resource.shared
                            ? 'Visibile ai giocatori'
                            : 'Nascosta ai giocatori'
                        }
                        tone={resource.shared ? 'accent' : 'neutral'}
                        onClick={() => patchResource(resource.id, { shared: !resource.shared })}
                        aria-pressed={resource.shared}
                      >
                        {resource.shared ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </IconButton>

                      <IconButton
                        label={isOpen ? 'Chiudi i colori' : 'Colori della risorsa'}
                        active={isOpen}
                        onClick={() => setExpandedResource(isOpen ? null : resource.id)}
                      >
                        <ChevronRight
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${
                            isOpen ? 'rotate-90' : ''
                          }`}
                        />
                      </IconButton>

                      <IconButton
                        label={`Elimina la risorsa ${index + 1}`}
                        tone="danger"
                        onClick={() => removeResource(resource.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>

                    {isOpen && (
                      <div className="mt-2 border-t border-bento-border/60 pt-2 animate-fade-in">
                        <ColorFields
                          value={resource}
                          onChange={(patch) => patchResource(resource.id, patch)}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------- effetti di stato */}
      <div className="space-y-2 border-t border-bento-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <SectionToggle
            title="Effetti di stato"
            badge={`${form.statusEffects.length}/${MAX_STATUS_EFFECTS}`}
            open={showEffects}
            onToggle={() => setShowEffects((v) => !v)}
          />

          {form.statusEffects.length < MAX_STATUS_EFFECTS && (
            <button
              type="button"
              onClick={addEffect}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-bento-border bg-bento-panel px-2 py-1 text-[11px] font-semibold text-theme-500 transition-colors duration-200 hover:border-slate-600 hover:text-theme-400"
            >
              <Plus className="h-3 w-3" />
              Aggiungi
            </button>
          )}
        </div>

        {showEffects && (
          <div className="space-y-2 animate-fade-in">
            {form.statusEffects.length === 0 ? (
              <p className="text-[11px] leading-snug text-slate-600">
                Targhette colorate accanto al nome: Avvelenato, Stordito, Furioso. Solo
                un&apos;etichetta con un colore, senza valori.
              </p>
            ) : (
              form.statusEffects.map((effect, index) => (
                <div key={effect.id} className="flex items-center gap-1.5">
                  <span
                    className="relative inline-flex h-6 w-6 shrink-0 rounded-full border border-bento-border"
                    style={{ backgroundColor: effect.color }}
                  >
                    <input
                      type="color"
                      value={effect.color}
                      onChange={(event) => patchEffect(effect.id, { color: event.target.value })}
                      aria-label={`Colore dell'effetto ${index + 1}`}
                      className="h-full w-full cursor-pointer opacity-0"
                    />
                  </span>

                  <input
                    type="text"
                    placeholder={`Effetto ${index + 1}`}
                    value={effect.name}
                    onChange={(event) => patchEffect(effect.id, { name: event.target.value })}
                    maxLength={24}
                    aria-label={`Nome dell'effetto ${index + 1}`}
                    className={`${FIELD_SM} min-w-0 flex-1`}
                  />

                  <IconButton
                    label={effect.shared ? 'Visibile ai giocatori' : 'Nascosto ai giocatori'}
                    tone={effect.shared ? 'accent' : 'neutral'}
                    onClick={() => patchEffect(effect.id, { shared: !effect.shared })}
                    aria-pressed={effect.shared}
                  >
                    {effect.shared ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </IconButton>

                  <IconButton
                    label={`Elimina l'effetto ${index + 1}`}
                    tone="danger"
                    onClick={() => removeEffect(effect.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* -------------------------------------------------- opzioni avanzate */}
      <div className="space-y-2 border-t border-bento-border pt-3">
        <SectionToggle
          title="Opzioni avanzate"
          open={showAdvanced}
          onToggle={() => setShowAdvanced((v) => !v)}
        />

        {showAdvanced && (
          <div className="space-y-2 animate-fade-in">
            <label className="flex items-center gap-2">
              <span className={ROW_LABEL}>Testo a 0</span>
              <input
                type="text"
                placeholder={DEFAULT_ZERO_HP_TEXT}
                value={form.zeroHpText}
                onChange={(event) => setField('zeroHpText', event.target.value)}
                maxLength={20}
                className={`${FIELD} w-full font-mono uppercase tracking-wider`}
              />
            </label>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-bento-border bg-bento-panel px-3 py-2.5 select-none">
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
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-bento-border pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-bento-border bg-bento-button px-4 py-2 text-xs font-medium text-slate-300 transition-colors duration-200 hover:bg-bento-border"
        >
          Annulla
        </button>
        <button
          type="submit"
          className="rounded-lg border border-theme-500 bg-theme-600 px-4 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-theme-500"
        >
          {bar ? 'Aggiorna Barra' : 'Crea Barra'}
        </button>
      </div>
    </form>
  );
}
