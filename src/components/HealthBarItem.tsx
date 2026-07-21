/**
 * Singola barra della vita.
 *
 * Interventi principali:
 *  - Pointer Events al posto di mousedown/mousemove/mouseup. Un solo percorso
 *    di codice copre mouse, dito e penna: prima il trascinamento non funzionava
 *    affatto su tablet e telefono.
 *  - Non serve più lo stato condiviso col gestore (`isMouseDown`,
 *    `activeBarIdRef`, `setIsMouseDown`): con `setPointerCapture` ogni barra
 *    segue il proprio puntatore da sola.
 *  - I `<style>` con i keyframes non vengono più iniettati nel DOM una volta
 *    per ogni barra renderizzata: stanno in index.css.
 *  - Sopra i 60 punti la barra passa a riempimento continuo. Prima disegnava un
 *    elemento per ogni punto ferita, senza alcun limite.
 *  - I suoni si attivano solo qui. Prima li suonava anche il gestore, quindi
 *    ogni variazione di HP produceva due suoni sovrapposti.
 *  - I controlli ±HP restano nascosti col mouse ma sono sempre visibili dove
 *    l'hover non esiste: prima erano invisibili e inutilizzabili su touch.
 *  - La barra è un vero `slider` accessibile, governabile da tastiera.
 */

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import type { HealthBar } from '../types';
import { Edit2, ShieldAlert, Trash2 } from 'lucide-react';
import {
  DEFAULT_ZERO_HP_TEXT,
  SEGMENT_THRESHOLD,
  healthRatio,
} from '../lib/healthBars';
import {
  playClickSound,
  playDamageSound,
  playDeathSound,
  playHealSound,
  playMaxHealthSound,
} from '../utils/audio';

interface Particle {
  id: number;
  value: number;
  offsetX: number;
}

interface HealthBarItemProps {
  bar: HealthBar;
  getBarColor: (bar: HealthBar) => string;
  onChangeValue: (bar: HealthBar, value: number) => void;
  onEdit?: (bar: HealthBar) => void;
  onDelete?: (bar: HealthBar) => void;
  readOnly?: boolean;
  layout?: 'horizontal' | 'vertical';
}

/** Intervallo minimo fra due suoni: durante il trascinamento gli HP cambiano
 *  molte volte al secondo e senza freno gli oscillatori si accavallavano. */
const SOUND_THROTTLE = 70;

/** Finestra entro cui le variazioni confluiscono in un'unica particella. */
const PARTICLE_MERGE_WINDOW = 450;

export function HealthBarItem({
  bar,
  getBarColor,
  onChangeValue,
  onEdit,
  onDelete,
  readOnly = false,
  layout = 'horizontal',
}: HealthBarItemProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [flash, setFlash] = useState<'damage' | 'heal' | null>(null);
  const [shaking, setShaking] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const prevValueRef = useRef(bar.currentValue);
  const lastSoundRef = useRef(0);
  const particleSeqRef = useRef(0);
  const activeParticleRef = useRef<{ id: number; until: number } | null>(null);
  const timersRef = useRef<number[]>([]);

  /** Ogni timer viene registrato per poterlo annullare allo smontaggio. */
  const schedule = (fn: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, delay);
    timersRef.current.push(id);
  };

  useEffect(
    () => () => {
      timersRef.current.forEach(window.clearTimeout);
      timersRef.current = [];
    },
    [],
  );

  // Reazioni al cambio di HP: suono, lampeggio, scossa, particella.
  useEffect(() => {
    const previous = prevValueRef.current;
    if (bar.currentValue === previous) return;

    const diff = bar.currentValue - previous;
    prevValueRef.current = bar.currentValue;

    const now = Date.now();
    if (now - lastSoundRef.current > SOUND_THROTTLE) {
      lastSoundRef.current = now;
      const ratio = healthRatio(bar);
      if (diff < 0) {
        if (bar.currentValue <= 0) playDeathSound();
        else playDamageSound(ratio);
      } else if (bar.currentValue >= bar.maxValue) {
        playMaxHealthSound();
      } else {
        playHealSound(ratio);
      }
    }

    setFlash(diff < 0 ? 'damage' : 'heal');
    schedule(() => setFlash(null), 400);

    if (diff < 0) {
      setShaking(true);
      schedule(() => setShaking(false), 300);
    }

    // Durante un trascinamento gli HP cambiano di continuo: invece di creare
    // una particella per ogni unità, si aggiorna quella già in volo con il
    // totale accumulato.
    const active = activeParticleRef.current;
    if (active && now < active.until) {
      setParticles((current) =>
        current.map((p) => (p.id === active.id ? { ...p, value: p.value + diff } : p)),
      );
      return;
    }

    const id = ++particleSeqRef.current;
    activeParticleRef.current = { id, until: now + PARTICLE_MERGE_WINDOW };
    setParticles((current) => [...current, { id, value: diff, offsetX: (Math.random() - 0.5) * 70 }]);
    schedule(() => {
      setParticles((current) => current.filter((p) => p.id !== id));
      if (activeParticleRef.current?.id === id) activeParticleRef.current = null;
    }, 1000);
  }, [bar]);

  const isVertical = layout === 'vertical';
  const percentage = healthRatio(bar) * 100;
  const activeColor = getBarColor(bar);
  const useSegments = bar.maxValue <= SEGMENT_THRESHOLD;

  /** Converte la posizione del puntatore in punti ferita. */
  const valueFromPointer = (event: ReactPointerEvent<HTMLDivElement>): number => {
    const track = trackRef.current;
    if (!track) return bar.currentValue;

    const rect = track.getBoundingClientRect();
    const ratio = isVertical
      ? 1 - (event.clientY - rect.top) / rect.height
      : (event.clientX - rect.left) / rect.width;

    const clamped = Math.max(0, Math.min(1, ratio));
    // `ceil` fa sì che toccare un segmento imposti proprio quel segmento.
    return clamped <= 0 ? 0 : Math.ceil(clamped * bar.maxValue);
  };

  const commit = (value: number) => {
    if (value !== bar.currentValue) onChangeValue(bar, value);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (readOnly || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    playClickSound();
    commit(valueFromPointer(event));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    commit(valueFromPointer(event));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  /** Alternativa da tastiera al trascinamento. */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const step = event.shiftKey ? 5 : 1;
    const actions: Record<string, number> = {
      ArrowRight: bar.currentValue + step,
      ArrowUp: bar.currentValue + step,
      ArrowLeft: bar.currentValue - step,
      ArrowDown: bar.currentValue - step,
      Home: 0,
      End: bar.maxValue,
    };
    const next = actions[event.key];
    if (next === undefined) return;
    event.preventDefault();
    commit(Math.max(0, Math.min(bar.maxValue, next)));
  };

  const flashRing =
    flash === 'damage'
      ? 'ring-2 ring-[#ff0055]/30 shadow-[inset_0_0_10px_rgba(255,0,85,0.2)]'
      : flash === 'heal'
        ? 'ring-2 ring-[#00ff88]/30 shadow-[inset_0_0_10px_rgba(0,255,136,0.2)]'
        : '';

  const track = (
    <div
      ref={trackRef}
      role={readOnly ? undefined : 'slider'}
      tabIndex={readOnly ? undefined : 0}
      aria-label={readOnly ? undefined : `Punti ferita di ${bar.name}`}
      aria-valuemin={readOnly ? undefined : 0}
      aria-valuemax={readOnly ? undefined : bar.maxValue}
      aria-valuenow={readOnly ? undefined : bar.currentValue}
      aria-valuetext={readOnly ? undefined : `${bar.currentValue} di ${bar.maxValue} punti ferita`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
      className={`relative z-10 flex overflow-hidden rounded-lg border border-[#2d333d] bg-[#1a1d23] p-[3px] select-none transition-shadow duration-200 ${
        isVertical ? 'h-full w-full flex-col-reverse' : 'h-8 w-full'
      } ${bar.maxValue > 30 ? 'gap-[1px]' : 'gap-[2px]'} ${
        readOnly ? '' : 'cursor-pointer touch-none'
      } ${flashRing}`}
    >
      {useSegments ? (
        Array.from({ length: bar.maxValue }, (_, index) => {
          const active = index < bar.currentValue;
          return (
            <div
              key={index}
              className={`flex-grow rounded-[2px] transition-all duration-200 ${
                isVertical ? 'w-full' : 'h-full'
              }`}
              style={{
                backgroundColor: activeColor,
                opacity: active ? 1 : 0.08,
                boxShadow: active ? `0 0 15px ${activeColor}70` : 'none',
                transform: active ? 'scale(1)' : 'scale(0.98)',
              }}
            />
          );
        })
      ) : (
        // Riempimento continuo: sopra i 60 punti i segmenti erano già disegnati
        // con `gap-0` e apparivano comunque come una barra piena.
        // Fondo spento e riempimento sono elementi separati: annidandoli,
        // l'opacità del fondo si moltiplicherebbe a quella del riempimento.
        <div
          className={`relative flex-1 overflow-hidden rounded-[2px] ${isVertical ? 'w-full' : 'h-full'}`}
        >
          <div
            className="absolute inset-0 rounded-[2px]"
            style={{ backgroundColor: activeColor, opacity: 0.08 }}
          />
          <div
            className="absolute inset-0 rounded-[2px] transition-transform duration-200"
            style={{
              backgroundColor: activeColor,
              boxShadow: `0 0 15px ${activeColor}70`,
              transform: isVertical
                ? `scaleY(${percentage / 100})`
                : `scaleX(${percentage / 100})`,
              transformOrigin: isVertical ? 'bottom' : 'left',
            }}
          />
        </div>
      )}
    </div>
  );

  const particleNodes = particles.map((particle) => (
    <div
      key={particle.id}
      className="health-particle pointer-events-none absolute top-1/2 left-1/2 z-50 font-display text-xl font-black md:text-2xl"
      style={
        {
          '--ox': `${particle.offsetX}px`,
          color: particle.value > 0 ? '#00ff88' : '#ff0055',
          textShadow: `0 0 10px ${particle.value > 0 ? '#00ff88' : '#ff0055'}`,
        } as React.CSSProperties
      }
    >
      {particle.value > 0 ? '+' : ''}
      {particle.value}
    </div>
  ));

  if (isVertical) {
    return (
      <div
        className={`relative flex h-full max-h-[300px] min-h-[160px] min-w-[52px] shrink-0 flex-row items-center justify-center gap-1.5 rounded-xl border border-bento-border bg-bento-bg p-2 pr-3 transition-colors duration-200 ${
          readOnly ? '' : 'hover:border-slate-600'
        } ${shaking ? 'health-shake' : ''}`}
      >
        <div className="flex h-full items-center justify-center">
          <span className="max-h-[140px] truncate font-display text-[13px] leading-none font-bold tracking-wider text-slate-200 uppercase [writing-mode:vertical-rl] rotate-180">
            {bar.name}
          </span>
        </div>

        <div className="flex h-full w-[28px] flex-col items-center justify-between">
          <div className="relative mb-1 flex w-full flex-grow justify-center">
            {track}
            {particleNodes}
          </div>

          <div className="flex shrink-0 flex-col items-center font-mono text-[10px] leading-none text-slate-400">
            <div className="flex items-center whitespace-nowrap">
              <span className="text-[11px] font-bold text-slate-100">{bar.currentValue}</span>
              <span className="mx-[1px] text-slate-600">/</span>
              <span>{bar.maxValue}</span>
            </div>
            <span className="mt-0.5 text-[9px] font-bold text-slate-500">
              ({Math.round(percentage)}%)
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative rounded-xl border border-bento-border bg-bento-bg p-3 transition-colors duration-200 sm:p-4 ${
        readOnly ? '' : 'hover:border-slate-600'
      } ${shaking ? 'health-shake' : ''}`}
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate font-display text-sm font-bold tracking-wide text-slate-200 md:text-base">
            {bar.name}
          </span>
          {bar.currentValue === 0 && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500">
              <ShieldAlert className="h-3 w-3" />
              {bar.zeroHpText || DEFAULT_ZERO_HP_TEXT}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!readOnly && (
            <div className="touch-visible flex items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
              {[
                { delta: -5, label: '-5 punti ferita', tone: 'hover:text-red-400' },
                { delta: -1, label: '-1 punto ferita', tone: 'hover:text-red-400' },
                { delta: 1, label: '+1 punto ferita', tone: 'hover:text-emerald-400' },
                { delta: 5, label: '+5 punti ferita', tone: 'hover:text-emerald-400' },
              ].map(({ delta, label, tone }) => (
                <button
                  key={delta}
                  type="button"
                  aria-label={label}
                  onClick={() => {
                    playClickSound();
                    commit(Math.max(0, Math.min(bar.maxValue, bar.currentValue + delta)));
                  }}
                  className={`rounded-lg px-1.5 py-1 font-mono text-xs font-bold text-slate-400 transition-colors duration-200 hover:bg-bento-button ${tone}`}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}

              {(onEdit || onDelete) && <span className="mx-0.5 h-4 w-px bg-bento-border" />}

              {onEdit && (
                <button
                  type="button"
                  aria-label={`Modifica ${bar.name}`}
                  onClick={() => {
                    playClickSound();
                    onEdit(bar);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors duration-200 hover:bg-bento-button hover:text-theme-400"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  aria-label={`Elimina ${bar.name}`}
                  onClick={() => {
                    playClickSound();
                    onDelete(bar);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="shrink-0 font-mono text-xs text-slate-400">
            <span className="text-sm font-bold text-slate-100">{bar.currentValue}</span>
            <span className="mx-1 text-slate-600">/</span>
            <span>{bar.maxValue}</span>
            <span className="ml-1.5 text-slate-500">({Math.round(percentage)}%)</span>
          </div>
        </div>
      </div>

      <div className="relative">
        {track}
        {particleNodes}
      </div>
    </div>
  );
}
