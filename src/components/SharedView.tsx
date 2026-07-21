/**
 * Schermo condiviso: la vista che i giocatori guardano, dal proiettore o dal
 * telefono.
 *
 * Era il punto più rotto dell'app dal lato responsive: il contenitore aveva
 * `min-w-[1024px]` scritto a mano e la griglia usava `col-span-3/5/4` senza
 * alcun breakpoint, quindi sotto i 1024px produceva scorrimento orizzontale e
 * le tre colonne non si impilavano mai.
 *
 * Ora il layout è: tre colonne da 1024px in su — identiche a prima — due
 * colonne su tablet con il dado a tutta larghezza sopra, e una sola colonna su
 * telefono con il dado per primo, che è ciò che i giocatori guardano davvero.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CampaignState, HealthBar, RollResult } from '../types';
import type { RoomUser } from '../firebaseUtils';
import {
  BookOpen,
  Dices,
  GripHorizontal,
  GripVertical,
  Heart,
  Maximize2,
  Shield,
  Sparkles,
  Star,
} from 'lucide-react';
import { HealthBarItem } from './HealthBarItem';
import { Modal } from './ui/Modal';
import { IconButton } from './ui/IconButton';
import { getBarColor, groupBars } from '../lib/healthBars';
import { isCritical, isFumble, parseSides } from '../lib/dice';
import { decodeRollLabel, latestPerRoller, resolveRollerName } from '../lib/participantRolls';
import { getThemeAccent } from '../theme';
import { playCritFailSound, playCritSuccessSound, playRollSound } from '../utils/audio';

const LAYOUT_KEY = 'fantasia_shared_health_layout';

type HealthLayout = 'horizontal' | 'vertical';

interface SharedViewProps {
  state: CampaignState;
  participantRolls?: RollResult[];
  roomUsers?: Record<string, RoomUser>;
  personalNotesSlot?: React.ReactNode;
  diceRollerSlot?: React.ReactNode;
  /** In modalità Lite non esistono giocatori collegati: il riquadro si nasconde. */
  isLite?: boolean;
}

const PANEL =
  'flex min-h-0 flex-col overflow-hidden rounded-xl border border-bento-border bg-bento-panel p-4 shadow-panel sm:p-5';

const PANEL_TITLE =
  'flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-wider text-slate-200 sm:text-base';

export function SharedView({
  state,
  participantRolls = [],
  roomUsers,
  personalNotesSlot,
  diceRollerSlot,
  isLite,
}: SharedViewProps) {
  const { title, players, healthBars, lastRoll, theme, activePlayerId, isRollHidden } = state;

  const [healthLayout, setHealthLayout] = useState<HealthLayout>(() => {
    try {
      return localStorage.getItem(LAYOUT_KEY) === 'vertical' ? 'vertical' : 'horizontal';
    } catch {
      return 'horizontal';
    }
  });
  const [shaking, setShaking] = useState(false);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [expandedNote, setExpandedNote] = useState<'campaign' | 'personal' | null>(null);

  const prevTimestampRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const accent = getThemeAccent(theme);

  // La preferenza di layout si perdeva a ogni ricaricamento della pagina.
  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_KEY, healthLayout);
    } catch {
      /* preferenza non essenziale */
    }
  }, [healthLayout]);

  useEffect(
    () => () => {
      timersRef.current.forEach(window.clearTimeout);
      timersRef.current = [];
    },
    [],
  );

  // Reazione a un nuovo lancio del master.
  useEffect(() => {
    if (!lastRoll || lastRoll.timestamp === prevTimestampRef.current) return;

    const isFirstObservation = prevTimestampRef.current === null;
    prevTimestampRef.current = lastRoll.timestamp;
    // Al primo render non si suona nulla: sarebbe l'eco di un lancio già visto.
    if (isFirstObservation) return;

    const schedule = (fn: () => void, delay: number) => {
      const id = window.setTimeout(() => {
        timersRef.current = timersRef.current.filter((t) => t !== id);
        fn();
      }, delay);
      timersRef.current.push(id);
    };

    setShaking(true);
    playRollSound();
    schedule(() => setShaking(false), 300);

    if (isCritical(lastRoll.result, lastRoll.diceType)) {
      playCritSuccessSound();
      setSparkles(
        Array.from({ length: 15 }, (_, index) => ({
          id: index,
          x: (Math.random() - 0.5) * 200,
          y: (Math.random() - 0.5) * 200 - 50,
        })),
      );
      schedule(() => setSparkles([]), 1500);
    } else if (isFumble(lastRoll.result, lastRoll.diceType)) {
      playCritFailSound();
    }
  }, [lastRoll]);

  const { groups, ungrouped } = groupBars(healthBars, state.healthGroups);

  const visibleRolls = useMemo(() => latestPerRoller(participantRolls), [participantRolls]);

  const renderBar = (bar: HealthBar) => (
    <HealthBarItem
      key={bar.id}
      bar={bar}
      getBarColor={getBarColor}
      onChangeValue={() => {}}
      readOnly
      layout={healthLayout}
    />
  );

  const barsContainer =
    healthLayout === 'vertical'
      ? 'flex flex-row gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin'
      : 'flex flex-col gap-3';

  const hasNotes = Boolean(state.campaignNotes.trim()) || Boolean(personalNotesSlot);

  return (
    <div className="relative flex min-h-full w-full flex-col overflow-x-hidden bg-bento-bg p-3 font-sans text-slate-100 sm:p-5 lg:p-8">
      {/* Aure di sfondo */}
      <div className="pointer-events-none fixed -top-[10%] -left-[10%] h-[50%] w-[50%] rounded-full bg-theme-500/5 blur-[120px]" />
      <div className="pointer-events-none fixed -right-[10%] -bottom-[10%] h-[50%] w-[50%] rounded-full bg-slate-900/50 blur-[120px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col rounded-2xl border border-bento-border/50 bg-bento-panel p-3 shadow-overlay sm:p-5 lg:p-8">
        <header className="mb-5 shrink-0 text-center">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-white sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-theme-600 opacity-80 sm:w-32" />
        </header>

        <div className="flex flex-1 flex-col gap-4 lg:gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-6">
            {/* Ordine di turno */}
            <section
              className={`${PANEL} order-3 md:order-2 lg:order-1 lg:col-span-3 lg:h-full`}
            >
              <div className="mb-3 shrink-0 border-b border-bento-border pb-3">
                <h2 className={PANEL_TITLE}>
                  <Shield className="h-5 w-5 text-theme-500" /> Ordine di Turno
                </h2>
              </div>

              <div className="max-h-[40vh] flex-1 space-y-2.5 overflow-y-auto pr-1 scrollbar-thin lg:max-h-none">
                {players.length === 0 ? (
                  <p className="py-6 text-center text-sm italic text-slate-600">
                    Nessun giocatore nell&apos;iniziativa.
                  </p>
                ) : (
                  players.map((player, index) => {
                    const isActive = player.id === activePlayerId;
                    return (
                      <div
                        key={player.id}
                        className={`flex flex-col rounded-xl border px-3 py-2.5 transition-colors duration-200 ${
                          isActive
                            ? 'border-theme-500 bg-slate-800 shadow-panel ring-1 ring-theme-500/20'
                            : 'border-bento-border bg-bento-bg'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-bold ${
                                isActive
                                  ? 'border-theme-500 bg-theme-500/10 text-theme-400'
                                  : 'border-bento-border bg-bento-panel text-slate-400'
                              }`}
                            >
                              {index + 1}
                            </span>
                            <span
                              className={`truncate font-display text-sm font-bold tracking-wide ${
                                isActive ? 'text-theme-400' : 'text-slate-200'
                              }`}
                            >
                              {player.name}
                            </span>
                          </div>

                          {isActive && (
                            <span className="flex shrink-0 animate-pulse items-center gap-1 rounded-full bg-theme-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-theme-500">
                              <Star className="h-2.5 w-2.5 fill-theme-500" /> Attivo
                            </span>
                          )}
                        </div>

                        {isActive && (player.inventory.length > 0 || player.bonus.length > 0) && (
                          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-bento-border/50 pt-3 animate-fade-in sm:grid-cols-2">
                            {(
                              [
                                { label: 'Inventario', items: player.inventory },
                                { label: 'Bonus', items: player.bonus },
                              ] as const
                            ).map(({ label, items }) =>
                              items.length > 0 ? (
                                <div key={label}>
                                  <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {label}
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {items.map((item) => (
                                      <span
                                        key={item.id}
                                        className="rounded-md border border-bento-border/60 bg-bento-item px-2 py-1 text-[11px] leading-none font-medium text-slate-300"
                                      >
                                        {item.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null,
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Salute */}
            <section
              className={`${PANEL} order-2 md:order-3 lg:order-2 lg:col-span-5 lg:h-full`}
            >
              <div className="mb-3 flex shrink-0 items-center justify-between border-b border-bento-border pb-3">
                <h2 className={PANEL_TITLE}>
                  <Heart className="h-5 w-5 text-theme-500" /> Stato della Salute
                </h2>
                <IconButton
                  label={
                    healthLayout === 'horizontal'
                      ? 'Passa alla vista verticale'
                      : 'Passa alla vista orizzontale'
                  }
                  onClick={() =>
                    setHealthLayout((current) =>
                      current === 'horizontal' ? 'vertical' : 'horizontal',
                    )
                  }
                  tip="left"
                >
                  {healthLayout === 'horizontal' ? (
                    <GripHorizontal className="h-5 w-5" />
                  ) : (
                    <GripVertical className="h-5 w-5" />
                  )}
                </IconButton>
              </div>

              <div className="max-h-[50vh] flex-1 space-y-5 overflow-y-auto pr-1 scrollbar-thin lg:max-h-none">
                {healthBars.length === 0 ? (
                  <p className="py-6 text-center text-sm italic text-slate-600">
                    Nessun tracciatore di salute.
                  </p>
                ) : (
                  <>
                    {groups.map(({ name, bars }) => (
                      <div key={name} className="space-y-2.5">
                        <div className="flex items-center gap-2 border-b border-bento-border/30 pb-1">
                          <span className="rounded border border-bento-border/40 bg-bento-bg px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {name}
                          </span>
                        </div>
                        <div className={barsContainer}>{bars.map(renderBar)}</div>
                      </div>
                    ))}

                    {ungrouped.length > 0 && (
                      <div className="space-y-2.5">
                        {groups.length > 0 && (
                          <div className="flex items-center gap-2 border-b border-bento-border/30 pb-1">
                            <span className="rounded border border-bento-border/40 bg-bento-bg px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Senza Gruppo
                            </span>
                          </div>
                        )}
                        <div className={barsContainer}>{ungrouped.map(renderBar)}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Dado, lanci dei giocatori, programmazione */}
            <div className="order-1 flex flex-col gap-4 md:order-1 md:col-span-2 lg:order-3 lg:col-span-4 lg:h-full">
              {diceRollerSlot && (
                <div className="relative z-20 shrink-0 overflow-hidden rounded-xl border border-bento-border bg-bento-bg shadow-panel">
                  {diceRollerSlot}
                </div>
              )}

              <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border border-bento-border bg-bento-panel p-4 text-center shadow-panel">
                <div className="pointer-events-none absolute inset-0 bg-radial from-theme-600/10 to-transparent opacity-60" />

                <div className="mb-2 w-full border-b border-bento-border pb-2">
                  <span className="font-mono text-xs uppercase tracking-widest text-slate-500">
                    Dado Master
                  </span>
                </div>

                {lastRoll ? (
                  <div
                    className={`relative z-10 flex w-full flex-1 flex-col items-center justify-center ${
                      shaking ? 'shared-dice-shake' : ''
                    }`}
                  >
                    <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-slate-500">
                      Dado {lastRoll.diceType}
                    </span>

                    {lastRoll.label && (
                      <span className="mt-1 inline-block rounded border border-bento-border bg-bento-bg px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300">
                        {lastRoll.label}
                      </span>
                    )}

                    <div className="relative my-2">
                      <span
                        className={`block font-display text-4xl font-black tracking-tighter text-white sm:text-5xl lg:text-6xl ${
                          isRollHidden ? 'opacity-30 blur-[2px]' : ''
                        }`}
                        style={{ filter: `drop-shadow(0 0 20px ${accent}59)` }}
                      >
                        {isRollHidden ? '?' : lastRoll.result}
                      </span>

                      {isRollHidden && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="z-20 rotate-12 rounded-lg border border-amber-500/30 bg-slate-900/80 px-3 py-1 font-mono text-base font-bold uppercase tracking-widest text-amber-500 shadow-overlay backdrop-blur-sm">
                            Nascosto
                          </span>
                        </div>
                      )}

                      {!isRollHidden &&
                        sparkles.map((sparkle) => (
                          <div
                            key={sparkle.id}
                            className="dice-particle pointer-events-none absolute top-1/2 left-1/2 z-50 text-theme-500"
                            style={
                              {
                                '--ox': `${sparkle.x}px`,
                                '--oy': `${sparkle.y}px`,
                              } as React.CSSProperties
                            }
                          >
                            <Sparkles className="h-5 w-5 opacity-80" />
                          </div>
                        ))}
                    </div>

                    {!isRollHidden && isCritical(lastRoll.result, lastRoll.diceType) && (
                      <div className="inline-flex animate-pulse items-center gap-1.5 rounded-full border border-theme-500/30 bg-theme-600/15 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-theme-500">
                        <Sparkles className="h-3.5 w-3.5" /> Critico!
                      </div>
                    )}

                    {!isRollHidden && isFumble(lastRoll.result, lastRoll.diceType) && (
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-theme-500/30 bg-theme-600/15 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-theme-500">
                        Fallimento critico!
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-slate-600">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-bento-border">
                      <Dices className="h-5 w-5" />
                    </span>
                    <p className="px-4 text-xs leading-snug italic">
                      In attesa del primo lancio...
                    </p>
                  </div>
                )}
              </div>

              {!isLite && (
                <div className="shrink-0 overflow-hidden rounded-xl border border-bento-border bg-bento-panel p-3 shadow-panel">
                  <span className="mb-2 block border-b border-bento-border/50 pb-1 font-display text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Lanci dei Giocatori
                  </span>

                  {visibleRolls.length === 0 ? (
                    <p className="py-2 text-center font-mono text-xs text-slate-600">
                      Nessun lancio
                    </p>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scroll-fade-x">
                      {visibleRolls.map((roll, index) => {
                        const decoded = decodeRollLabel(roll.label);
                        const name = resolveRollerName(decoded, (userId) => {
                          const user = roomUsers?.[userId];
                          if (!user) return null;
                          const assigned = players.find((p) => p.id === user.assignedPlayerId);
                          return assigned ? assigned.name : user.name;
                        });

                        return (
                          <div
                            key={`${roll.timestamp}-${index}`}
                            className="relative flex min-w-[100px] shrink-0 flex-col overflow-hidden rounded-lg border border-bento-border bg-bento-bg p-2 shadow-panel"
                          >
                            <div className="mb-1 flex items-center justify-between gap-1 border-b border-bento-border pb-1">
                              <span
                                className="truncate font-mono text-[10px] font-bold text-slate-300"
                                title={name}
                              >
                                {name}
                              </span>
                              <span className="shrink-0 rounded bg-bento-void px-1 py-0.5 text-[9px] font-bold text-slate-500">
                                {roll.diceType}
                              </span>
                            </div>

                            <div className="relative flex items-center justify-center py-1">
                              <span
                                className={`font-display text-2xl font-black ${
                                  roll.result === parseSides(roll.diceType)
                                    ? 'text-theme-400'
                                    : roll.result === 1
                                      ? 'text-theme-500'
                                      : 'text-white'
                                }`}
                              >
                                {roll.result}
                              </span>
                              {isCritical(roll.result, roll.diceType) && (
                                <Sparkles className="absolute top-0 right-1 h-3 w-3 text-theme-400 opacity-60" />
                              )}
                            </div>

                            {decoded.label && (
                              <span
                                className="mt-1 block w-full truncate rounded bg-slate-800/50 px-1 py-0.5 text-center text-[9px] font-bold uppercase tracking-widest text-slate-400"
                                title={decoded.label}
                              >
                                {decoded.label}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {(state.scheduleDay || state.scheduleTime) && (
                <div className="flex shrink-0 items-center justify-center gap-3 rounded-xl border border-bento-border bg-bento-panel p-3 text-center shadow-panel">
                  {state.scheduleDay && (
                    <span className="font-display text-sm font-bold capitalize text-slate-200">
                      {state.scheduleDay}
                    </span>
                  )}
                  {state.scheduleDay && state.scheduleTime && (
                    <span className="font-light text-slate-600">|</span>
                  )}
                  {state.scheduleTime && (
                    <span className="font-mono text-sm font-bold text-theme-500">
                      {state.scheduleTime}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {hasNotes && (
            <div className="flex shrink-0 flex-col gap-4 md:flex-row">
              {state.campaignNotes.trim() && (
                <div className={`${PANEL} min-h-[10rem] flex-[3]`}>
                  <div className="mb-3 flex shrink-0 items-center justify-between border-b border-bento-border pb-3">
                    <h2 className={PANEL_TITLE}>
                      <BookOpen className="h-4 w-4 text-theme-500" /> Appunti Campagna
                    </h2>
                    <IconButton
                      label="Espandi appunti campagna"
                      onClick={() => setExpandedNote('campaign')}
                      tip="left"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                  <div className="flex-1 overflow-y-auto rounded-lg border border-bento-border bg-bento-bg p-3 font-sans text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-200 scrollbar-thin">
                    {state.campaignNotes}
                  </div>
                </div>
              )}

              {personalNotesSlot && (
                <div className={`${PANEL} min-h-[10rem] flex-[2]`}>
                  <div className="mb-3 flex shrink-0 items-center justify-between border-b border-bento-border pb-3">
                    <h2 className={PANEL_TITLE}>
                      <BookOpen className="h-4 w-4 text-emerald-400" /> Appunti Personali
                    </h2>
                    <IconButton
                      label="Espandi appunti personali"
                      onClick={() => setExpandedNote('personal')}
                      tip="left"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col">{personalNotesSlot}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={expandedNote === 'campaign'}
        onClose={() => setExpandedNote(null)}
        title={
          <>
            <BookOpen className="h-4 w-4 text-theme-500" /> Appunti Campagna
          </>
        }
      >
        <div className="flex-1 overflow-y-auto rounded-lg bg-bento-bg p-4 font-sans text-base leading-relaxed whitespace-pre-wrap break-words text-slate-200 sm:p-6">
          {state.campaignNotes}
        </div>
      </Modal>

      <Modal
        open={expandedNote === 'personal' && Boolean(personalNotesSlot)}
        onClose={() => setExpandedNote(null)}
        title={
          <>
            <BookOpen className="h-4 w-4 text-emerald-400" /> Appunti Personali
          </>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-bento-bg p-4 sm:p-6">
          {personalNotesSlot}
        </div>
      </Modal>
    </div>
  );
}
