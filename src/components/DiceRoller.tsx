/**
 * Lancio dei dadi.
 *
 * Interventi principali:
 *  - Il `setInterval` dell'animazione non veniva mai fermato allo smontaggio:
 *    continuava a scrivere stato su un componente inesistente.
 *  - Lo storico mostrava "Nessun lancio registrato" finché i lanci erano ≤ 1 e
 *    poi faceva `.slice(1)`: dopo il primo lancio dichiarava che non c'era nulla.
 *    Ora si vedono tutti i lanci, con il più recente evidenziato.
 *  - L'etichetta selezionata sopravvive al ricaricamento della pagina.
 *  - `isManagingLabels ? '${colors.textActive} underline'` usava apici singoli:
 *    la stringa `${colors.textActive}` finiva letteralmente nell'attributo class.
 *  - Scorciatoie da tastiera: 1-7 scelgono il dado, Spazio lancia.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RollResult } from '../types';
import { Check, Dices, Edit2, Eye, EyeOff, Plus, RotateCcw, Sparkles, Tag, Trash2, X } from 'lucide-react';
import { DICE_TYPES, isCritical, isFumble, parseSides, rollDie } from '../lib/dice';
import { getThemeAccent } from '../theme';
import type { CampaignTheme } from '../theme';
import { playCritFailSound, playCritSuccessSound, playRollSound } from '../utils/audio';
import { ConfirmInline } from './ui/ConfirmInline';
import { IconButton } from './ui/IconButton';

const LABEL_STORAGE_KEY = 'fantasia_selected_dice_label';
const TICK_MS = 60;
const TICKS = 9;

interface DiceRollerProps {
  onRoll: (diceType: string, result: number, label?: string) => void;
  lastRoll: RollResult | null;
  selectedDice: string;
  onSelectedDiceChange: (dice: string) => void;
  theme: CampaignTheme;
  rollHistory?: RollResult[];
  isRollHidden?: boolean;
  onToggleRollVisibility?: () => void;
  onClearHistory?: () => void;
  diceLabels?: string[];
  onAddDiceLabel?: (label: string) => void;
  onRenameDiceLabel?: (from: string, to: string) => void;
  onDeleteDiceLabel?: (label: string) => void;
  hideHistory?: boolean;
  /** Attiva le scorciatoie globali. Solo la dashboard del master le usa. */
  enableShortcuts?: boolean;
}

export function DiceRoller({
  onRoll,
  lastRoll,
  selectedDice,
  onSelectedDiceChange,
  theme,
  rollHistory = [],
  isRollHidden = false,
  onToggleRollVisibility,
  onClearHistory,
  diceLabels = [],
  onAddDiceLabel,
  onRenameDiceLabel,
  onDeleteDiceLabel,
  hideHistory = false,
  enableShortcuts = false,
}: DiceRollerProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [tempNumber, setTempNumber] = useState<number | null>(null);
  const [shaking, setShaking] = useState(false);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);

  const [selectedLabel, setSelectedLabel] = useState(() => {
    try {
      return localStorage.getItem(LABEL_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });

  const [managingLabels, setManagingLabels] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState('');
  const [deletingLabel, setDeletingLabel] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const accent = getThemeAccent(theme);

  // Un'etichetta cancellata altrove non deve restare selezionata.
  useEffect(() => {
    if (selectedLabel && !diceLabels.includes(selectedLabel)) setSelectedLabel('');
  }, [diceLabels, selectedLabel]);

  useEffect(() => {
    try {
      localStorage.setItem(LABEL_STORAGE_KEY, selectedLabel);
    } catch {
      /* preferenza non essenziale */
    }
  }, [selectedLabel]);

  // Pulizia di tutti i timer: era la fonte degli aggiornamenti su componenti
  // già smontati.
  useEffect(
    () => () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      timeoutsRef.current.forEach(window.clearTimeout);
    },
    [],
  );

  const schedule = (fn: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
      fn();
    }, delay);
    timeoutsRef.current.push(id);
  };

  const roll = useCallback(() => {
    if (isRolling) return;

    setIsRolling(true);
    setShaking(false);
    setSparkles([]);
    playRollSound();

    let tick = 0;
    intervalRef.current = window.setInterval(() => {
      tick += 1;

      if (tick <= TICKS) {
        setTempNumber(rollDie(selectedDice));
        return;
      }

      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;

      const result = rollDie(selectedDice);
      setTempNumber(result);
      setIsRolling(false);
      onRoll(selectedDice, result, selectedLabel || undefined);

      if (isCritical(result, selectedDice)) {
        playCritSuccessSound();
        setSparkles(
          Array.from({ length: 16 }, (_, index) => {
            const angle = (index / 16) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
            const distance = 50 + Math.random() * 120;
            return {
              id: index,
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance - 30,
            };
          }),
        );
        schedule(() => setSparkles([]), 1200);
      } else if (isFumble(result, selectedDice)) {
        playCritFailSound();
        setShaking(true);
        schedule(() => setShaking(false), 500);
      }
    }, TICK_MS);
  }, [isRolling, selectedDice, selectedLabel, onRoll]);

  // Scorciatoie: 1-7 scelgono il dado, Spazio lancia. Disattivate mentre si
  // scrive, altrimenti renderebbero inutilizzabili le aree di testo.
  useEffect(() => {
    if (!enableShortcuts) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
      ) {
        return;
      }
      if (document.querySelector('[role="dialog"]')) return;

      const index = Number.parseInt(event.key, 10) - 1;
      if (index >= 0 && index < DICE_TYPES.length) {
        event.preventDefault();
        onSelectedDiceChange(DICE_TYPES[index]);
        return;
      }

      if (event.code === 'Space' || event.key.toLowerCase() === 'r') {
        event.preventDefault();
        roll();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enableShortcuts, onSelectedDiceChange, roll]);

  const canManageLabels = Boolean(onAddDiceLabel || onRenameDiceLabel || onDeleteDiceLabel);
  const critical = lastRoll ? isCritical(lastRoll.result, lastRoll.diceType) : false;
  const fumble = lastRoll ? isFumble(lastRoll.result, lastRoll.diceType) : false;

  return (
    <section
      className={`relative flex h-full flex-col overflow-hidden rounded-xl border bg-bento-panel p-4 shadow-panel transition-colors duration-300 sm:p-6 ${
        shaking ? 'shake-animation border-theme-500' : 'border-bento-border'
      }`}
    >
      <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-slate-200">
        <span className="h-2 w-2 animate-pulse rounded-full bg-theme-600" />
        Lancio dei Dadi
      </h2>

      <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {DICE_TYPES.map((dice, index) => (
          <button
            key={dice}
            type="button"
            onClick={() => onSelectedDiceChange(dice)}
            disabled={isRolling}
            aria-pressed={selectedDice === dice}
            title={enableShortcuts ? `Scorciatoia: ${index + 1}` : undefined}
            className={`min-w-[44px] flex-[1_0_calc(25%-6px)] rounded-lg border px-2 py-2 text-center font-mono text-[13px] font-bold transition-colors duration-200 sm:flex-[1_0_auto] sm:px-3 sm:text-sm ${
              selectedDice === dice
                ? 'border-theme-500 bg-theme-600 text-white shadow-panel'
                : 'border-bento-border bg-bento-bg text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}
          >
            {dice}
          </button>
        ))}
      </div>

      {diceLabels.length > 0 || canManageLabels ? (
        <div className="mb-4 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="dice-label"
              className="flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400"
            >
              <Tag className="h-3.5 w-3.5 text-slate-500" />
              Associa Etichetta
            </label>
            {canManageLabels && (
              <button
                type="button"
                onClick={() => setManagingLabels((v) => !v)}
                aria-expanded={managingLabels}
                className={`text-[10px] font-semibold transition-colors duration-200 ${
                  managingLabels
                    ? 'text-theme-400 underline'
                    : 'text-slate-500 hover:text-theme-400'
                }`}
              >
                Gestisci Etichette
              </button>
            )}
          </div>

          <select
            id="dice-label"
            value={selectedLabel}
            onChange={(event) => setSelectedLabel(event.target.value)}
            disabled={isRolling}
            className="w-full cursor-pointer rounded-lg border border-bento-border bg-bento-bg px-2.5 py-1.5 text-xs text-slate-200 transition-colors duration-200 focus:border-theme-500 focus:outline-none focus:ring-1 focus:ring-theme-500/20"
          >
            <option value="">Nessuna Etichetta</option>
            {diceLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {managingLabels && canManageLabels && (
        <div className="mb-4 space-y-3 rounded-xl border border-bento-border bg-bento-bg p-3.5 text-left animate-fade-in">
          <div className="flex items-center justify-between border-b border-bento-border pb-1.5">
            <span className="font-mono text-[10px] font-bold uppercase text-theme-500">
              Gestisci Etichette
            </span>
            <IconButton
              label="Chiudi"
              onClick={() => {
                setManagingLabels(false);
                setEditingLabel(null);
                setDeletingLabel(null);
              }}
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>

          {onAddDiceLabel && (
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Nuova etichetta..."
                value={newLabel}
                onChange={(event) => setNewLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || !newLabel.trim()) return;
                  event.preventDefault();
                  onAddDiceLabel(newLabel.trim());
                  setNewLabel('');
                }}
                maxLength={24}
                aria-label="Nuova etichetta"
                className="flex-grow rounded border border-bento-border bg-bento-panel px-2.5 py-1.5 text-xs text-slate-100 transition-colors duration-200 focus:border-theme-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newLabel.trim()) return;
                  onAddDiceLabel(newLabel.trim());
                  setNewLabel('');
                }}
                disabled={!newLabel.trim()}
                aria-label="Aggiungi etichetta"
                className="rounded bg-theme-600 px-3 py-1.5 text-white transition-colors duration-200 hover:bg-theme-500 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="max-h-32 space-y-1.5 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin">
            {diceLabels.map((label) => (
              <div
                key={label}
                className="flex items-center justify-between gap-2 rounded border border-bento-border bg-bento-panel/30 px-2.5 py-1.5 text-xs"
              >
                {deletingLabel === label ? (
                  <ConfirmInline
                    question={`Eliminare "${label}"?`}
                    onConfirm={() => {
                      onDeleteDiceLabel?.(label);
                      setDeletingLabel(null);
                    }}
                    onCancel={() => setDeletingLabel(null)}
                  />
                ) : editingLabel === label ? (
                  <div className="flex flex-grow items-center gap-1">
                    <input
                      type="text"
                      value={tempLabel}
                      onChange={(event) => setTempLabel(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          if (tempLabel.trim() && tempLabel.trim() !== label) {
                            onRenameDiceLabel?.(label, tempLabel.trim());
                          }
                          setEditingLabel(null);
                        }
                        if (event.key === 'Escape') setEditingLabel(null);
                      }}
                      maxLength={24}
                      autoFocus
                      aria-label={`Nuovo nome per ${label}`}
                      className="flex-grow rounded border border-bento-border bg-bento-panel px-1.5 py-0.5 text-[11px] text-slate-100 focus:border-theme-500 focus:outline-none"
                    />
                    <IconButton
                      label="Conferma"
                      tone="positive"
                      onClick={() => {
                        if (tempLabel.trim() && tempLabel.trim() !== label) {
                          onRenameDiceLabel?.(label, tempLabel.trim());
                        }
                        setEditingLabel(null);
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </IconButton>
                    <IconButton label="Annulla" onClick={() => setEditingLabel(null)}>
                      <X className="h-3 w-3" />
                    </IconButton>
                  </div>
                ) : (
                  <>
                    <span className="truncate font-medium text-slate-300">{label}</span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {onRenameDiceLabel && (
                        <IconButton
                          label={`Rinomina ${label}`}
                          tone="accent"
                          onClick={() => {
                            setEditingLabel(label);
                            setTempLabel(label);
                            setDeletingLabel(null);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </IconButton>
                      )}
                      {onDeleteDiceLabel && (
                        <IconButton
                          label={`Elimina ${label}`}
                          tone="danger"
                          onClick={() => {
                            setDeletingLabel(label);
                            setEditingLabel(null);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </IconButton>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative mb-5 flex min-h-[140px] flex-grow flex-col items-center justify-center rounded-xl border border-bento-border bg-bento-bg p-4 sm:p-6">
        {onToggleRollVisibility && lastRoll && !isRolling && (
          <div className="absolute top-2 right-2">
            <IconButton
              label={isRollHidden ? 'Mostra il lancio ai giocatori' : 'Nascondi il lancio'}
              onClick={onToggleRollVisibility}
              tip="left"
              className={isRollHidden ? 'text-amber-500 hover:text-amber-400' : ''}
            >
              {isRollHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </IconButton>
          </div>
        )}

        {isRolling && (
          <div className="absolute inset-0 animate-pulse rounded-xl bg-theme-600/5 blur-xl" />
        )}

        {sparkles.map((sparkle) => (
          <div
            key={sparkle.id}
            className="sparkle-particle pointer-events-none absolute z-20 h-2 w-2 rounded-full bg-theme-400"
            style={
              {
                left: '50%',
                top: '50%',
                '--tw-x': `${sparkle.x}px`,
                '--tw-y': `${sparkle.y}px`,
                boxShadow: `0 0 8px ${accent}, 0 0 3px #fef08a`,
              } as React.CSSProperties
            }
          />
        ))}

        {isRolling ? (
          <div className="flex flex-col items-center">
            <span className="animate-pulse font-display text-5xl font-extrabold tracking-tighter text-theme-500/90 blur-[1px] sm:text-6xl">
              {tempNumber ?? '?'}
            </span>
            <span className="mt-3 animate-pulse font-mono text-xs uppercase tracking-widest text-theme-500/60">
              Rotolando...
            </span>
          </div>
        ) : lastRoll ? (
          <div className="relative flex flex-col items-center text-center">
            <span className="mb-1 flex flex-wrap items-center justify-center gap-1.5 font-mono text-xs uppercase tracking-widest text-slate-500">
              Risultato {lastRoll.diceType}
              {lastRoll.label && (
                <span className="rounded border border-bento-border bg-bento-void px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                  {lastRoll.label}
                </span>
              )}
            </span>

            <span
              className={`dice-animation font-display text-5xl font-extrabold tracking-tighter text-white sm:text-6xl ${
                isRollHidden ? 'opacity-30 blur-[2px]' : ''
              }`}
              style={{ filter: `drop-shadow(0 0 15px ${accent}33)` }}
            >
              {lastRoll.result}
            </span>

            {critical && (
              <span className="mt-2 flex items-center gap-1 rounded-full bg-theme-500/10 px-2 py-0.5 text-xs font-semibold text-theme-500">
                <Sparkles className="h-3 w-3" /> CRITICO!
              </span>
            )}
            {fumble && (
              <span className="mt-2 flex items-center gap-1 rounded-full bg-theme-500/10 px-2 py-0.5 text-xs font-semibold text-theme-500">
                FALLIMENTO!
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <Dices className="h-8 w-8 text-slate-700" />
            <p className="text-sm font-light text-slate-500">
              Seleziona un dado e premi Lancia
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={roll}
        disabled={isRolling}
        className="w-full rounded-xl border border-theme-500 bg-theme-600 py-3 font-display text-base font-bold uppercase tracking-wider text-white shadow-raised transition-colors duration-200 hover:bg-theme-500 active:scale-[0.98] disabled:opacity-50"
      >
        {isRolling ? 'Lancio...' : `Lancia ${selectedDice}`}
      </button>

      {!hideHistory && (
        <div className="mt-5 border-t border-bento-border pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-display text-xs font-semibold uppercase tracking-wider text-slate-400">
              Storico Lanci
            </span>
            {rollHistory.length > 0 && onClearHistory && (
              <button
                type="button"
                onClick={onClearHistory}
                className="flex items-center gap-1 text-[10px] text-slate-500 transition-colors duration-200 hover:text-slate-300"
              >
                <RotateCcw className="h-3 w-3" />
                Svuota
              </button>
            )}
          </div>

          {rollHistory.length === 0 ? (
            <p className="text-xs italic text-slate-600">
              Nessun lancio registrato in questa sessione.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scroll-fade-x">
              {rollHistory.map((entry, index) => (
                <div
                  key={`${entry.timestamp}-${index}`}
                  className={`relative flex min-w-[66px] shrink-0 flex-col items-center rounded-lg border bg-bento-bg px-3 py-1 ${
                    index === 0 ? 'border-theme-500/40' : 'border-bento-border'
                  }`}
                >
                  <span className="font-mono text-[10px] font-bold text-slate-500">
                    {entry.diceType}
                  </span>
                  <span
                    className={`font-display text-base font-bold ${
                      entry.result === parseSides(entry.diceType)
                        ? 'text-theme-400'
                        : entry.result === 1
                          ? 'text-theme-500'
                          : 'text-slate-200'
                    }`}
                  >
                    {entry.result}
                  </span>
                  {entry.label && (
                    <span
                      className="max-w-[58px] truncate text-center font-mono text-[8px] uppercase text-slate-500"
                      title={entry.label}
                    >
                      {entry.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
