/**
 * Singola barra della vita, con le sue risorse.
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
 *  - Il disegno e il trascinamento vivono in `BarTrack`, condiviso fra la barra
 *    della vita e le sue risorse: mana, scudo, frenesia si trascinano con lo
 *    stesso gesto, senza duplicare la logica del puntatore.
 */

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import type { HealthBar, Resource } from '../types';
import { ChevronDown, ChevronUp, Edit2, GripVertical, ShieldAlert, Trash2 } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';
import {
  DEFAULT_ZERO_HP_TEXT,
  SEGMENT_THRESHOLD,
  THIN_SEGMENT_THRESHOLD,
  VERTICAL_SEGMENT_THRESHOLD,
  getBarColor,
  healthRatio,
  isLowHp,
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

/**
 * Comandi di riordino, forniti dal gestore (che coordina il trascinamento fra
 * più barre). La maniglia è `draggable`, la scheda è bersaglio del rilascio; le
 * frecce sono l'alternativa da tocco e tastiera.
 */
export interface ReorderControls {
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  dragging: boolean;
  dragOver: boolean;
}

interface HealthBarItemProps {
  bar: HealthBar;
  onChangeValue: (bar: HealthBar, value: number) => void;
  /** Assente = risorse in sola lettura. */
  onChangeResource?: (bar: HealthBar, resource: Resource, value: number) => void;
  /** Nella vista condivisa mostra solo risorse ed effetti contrassegnati come pubblici. */
  onlyShared?: boolean;
  onEdit?: (bar: HealthBar) => void;
  onDelete?: (bar: HealthBar) => void;
  /** Presente solo in dashboard: abilita maniglia e frecce di riordino. */
  reorder?: ReorderControls;
  readOnly?: boolean;
  layout?: 'horizontal' | 'vertical';
}

/** Intervallo minimo fra due suoni: durante il trascinamento gli HP cambiano
 *  molte volte al secondo e senza freno gli oscillatori si accavallavano. */
const SOUND_THROTTLE = 70;

/** Finestra entro cui le variazioni confluiscono in un'unica particella. */
const PARTICLE_MERGE_WINDOW = 450;

/**
 * Dimensioni della barra verticale, per numero di risorse mostrate.
 *
 * Prima erano `h-full max-h-[300px] min-h-[160px]`, ma il contenitore che la
 * ospita non ha altezza definita: `height: 100%` si risolveva in `auto` e sia
 * `h-full` sia `max-h` erano inerti. Ogni barra era alta esattamente 160px su
 * qualunque schermo — sprecando spazio sul proiettore e occupandone troppo sul
 * telefono. Ora l'altezza è esplicita e cresce con il breakpoint.
 *
 * Le larghezze sono scritte per esteso invece che calcolate: Tailwind estrae le
 * classi dal testo sorgente, quindi una stringa composta a runtime non
 * genererebbe alcun CSS.
 */
const VERTICAL_SIZE = [
  'h-[150px] w-[50px] sm:h-[190px] sm:w-[54px] lg:h-[230px] lg:w-[58px] xl:h-[270px]',
  'h-[150px] w-[70px] sm:h-[190px] sm:w-[74px] lg:h-[230px] lg:w-[78px] xl:h-[270px]',
  'h-[150px] w-[90px] sm:h-[190px] sm:w-[94px] lg:h-[230px] lg:w-[98px] xl:h-[270px]',
];

/** Colonna che contiene le tracce, larga quanto basta per le risorse presenti. */
const VERTICAL_COLUMN = ['w-[24px] sm:w-[26px]', 'w-[44px] sm:w-[46px]', 'w-[64px] sm:w-[66px]'];

/** Sigla di un effetto, per le targhette compatte: le prime due lettere. */
const statusInitials = (name: string): string => name.trim().slice(0, 2).toUpperCase() || '•';

interface BarTrackProps {
  value: number;
  max: number;
  color: string;
  vertical: boolean;
  /** Traccia di una risorsa: molto più sottile di quella della vita. */
  thin?: boolean;
  readOnly?: boolean;
  onChange?: (value: number) => void;
  label: string;
  /** Pulsazione dell'allerta sotto soglia. Solo per la barra della vita. */
  alert?: boolean;
  /** Dimensioni del contenitore sensibile: le decide il chiamante. */
  className?: string;
  /** Classi aggiuntive sulla traccia, per il lampeggio di danno e cura. */
  trackClassName?: string;
}

/**
 * Traccia interattiva, unica per barre della vita e risorse.
 *
 * Il contenitore sensibile è più grande della traccia visibile: una risorsa è
 * alta dieci pixel, e senza quel margine sarebbe impossibile da colpire con un
 * dito. La spaziatura sta sull'asse che *non* viene misurato — verticale per le
 * barre orizzontali e viceversa — così ingrandisce l'area del gesto senza
 * falsare la conversione fra posizione e valore.
 */
function BarTrack({
  value,
  max,
  color,
  vertical,
  thin = false,
  readOnly = false,
  onChange,
  label,
  alert = false,
  className = '',
  trackClassName = '',
}: BarTrackProps) {
  const hitRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const interactive = !readOnly && Boolean(onChange);
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const segmentThreshold = thin
    ? THIN_SEGMENT_THRESHOLD
    : vertical
      ? VERTICAL_SEGMENT_THRESHOLD
      : SEGMENT_THRESHOLD;
  const useSegments = max <= segmentThreshold;

  const commit = (next: number) => {
    if (!onChange) return;
    const clamped = Math.max(0, Math.min(max, next));
    if (clamped !== value) onChange(clamped);
  };

  const valueFromPointer = (event: ReactPointerEvent<HTMLDivElement>): number => {
    const hit = hitRef.current;
    if (!hit) return value;

    const rect = hit.getBoundingClientRect();
    const ratio = vertical
      ? 1 - (event.clientY - rect.top) / rect.height
      : (event.clientX - rect.left) / rect.width;

    const clamped = Math.max(0, Math.min(1, ratio));
    // `ceil` fa sì che toccare un segmento imposti proprio quel segmento.
    return clamped <= 0 ? 0 : Math.ceil(clamped * max);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive || event.button !== 0) return;
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
    if (!interactive) return;
    const step = event.shiftKey ? 5 : 1;
    const actions: Record<string, number> = {
      ArrowRight: value + step,
      ArrowUp: value + step,
      ArrowLeft: value - step,
      ArrowDown: value - step,
      Home: 0,
      End: max,
    };
    const next = actions[event.key];
    if (next === undefined) return;
    event.preventDefault();
    commit(next);
  };

  const hitPadding = thin ? (vertical ? 'px-1' : 'py-1') : '';
  const trackSize = vertical ? 'h-full w-full' : thin ? 'h-2.5 w-full' : 'h-8 w-full';
  const trackRounding = thin ? 'rounded-md' : 'rounded-lg';
  const trackPadding = thin ? 'p-px' : 'p-[3px]';
  const segmentGap = thin ? 'gap-px' : max > 30 ? 'gap-[1px]' : 'gap-[2px]';

  /**
   * `hp-track--thin` non è decorativa: ogni design ridefinisce padding, spazi e
   * spessore del bordo di `.hp-track` con selettori più specifici delle utility
   * qui sopra, e quelle misure su dieci pixel azzerano il riempimento. La
   * classe è l'aggancio con cui `index.css` le riporta in proporzione.
   */
  const trackVariant = thin ? 'hp-track--thin' : '';

  return (
    <div
      ref={hitRef}
      role={interactive ? 'slider' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? label : undefined}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? max : undefined}
      aria-valuenow={interactive ? value : undefined}
      aria-valuetext={interactive ? `${value} di ${max}` : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
      title={thin ? `${label}: ${value}/${max}` : undefined}
      className={`relative ${hitPadding} ${
        interactive ? 'cursor-pointer touch-none' : ''
      } ${className}`}
    >
      <div
        // Il colore attivo viaggia come variabile CSS: l'animazione di allerta ha
        // così accesso al colore reale della barra, che cambia a runtime.
        style={{ '--hp-color': color } as React.CSSProperties}
        // `hp-track` è l'aggancio con cui ogni design ridefinisce l'aspetto della
        // barra. I colori sono token, non più esadecimali scritti a mano: era
        // l'ultimo punto che ignorava il design scelto.
        className={`hp-track relative z-10 flex overflow-hidden border border-bento-border bg-bento-item select-none transition-shadow duration-200 ${trackVariant} ${trackRounding} ${trackPadding} ${trackSize} ${segmentGap} ${
          vertical ? 'flex-col-reverse' : 'flex-row'
        } ${alert ? 'is-alert' : ''} ${trackClassName}`}
      >
        {useSegments ? (
          Array.from({ length: max }, (_, index) => {
            const active = index < value;
            return (
              <div
                key={index}
                className={`hp-segment flex-grow rounded-sm transition-all duration-200 ${
                  vertical ? 'w-full' : 'h-full'
                }`}
                style={{
                  backgroundColor: color,
                  opacity: active ? 1 : 0.08,
                  boxShadow: active ? `0 0 15px ${color}70` : 'none',
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
            className={`relative flex-1 overflow-hidden rounded-sm ${vertical ? 'w-full' : 'h-full'}`}
          >
            <div
              className="absolute inset-0 rounded-sm"
              style={{ backgroundColor: color, opacity: 0.08 }}
            />
            <div
              className="hp-segment absolute inset-0 rounded-sm transition-transform duration-200"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 15px ${color}70`,
                transform: vertical
                  ? `scaleY(${percentage / 100})`
                  : `scaleX(${percentage / 100})`,
                transformOrigin: vertical ? 'bottom' : 'left',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function HealthBarItem({
  bar,
  onChangeValue,
  onChangeResource,
  onlyShared = false,
  onEdit,
  onDelete,
  reorder,
  readOnly = false,
  layout = 'horizontal',
}: HealthBarItemProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [flash, setFlash] = useState<'damage' | 'heal' | null>(null);
  const [shaking, setShaking] = useState(false);

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
  // Solo la barra della vita: le risorse cambiano spesso e in silenzio.
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
  const inAlert = isLowHp(bar);

  // Nella vista condivisa il master vede esattamente ciò che vedono i giocatori:
  // risorse ed effetti tenuti privati spariscono anche dalla sua anteprima.
  const resources = (bar.resources ?? []).filter(
    (resource) => !onlyShared || resource.shared,
  );
  const statusEffects = (bar.statusEffects ?? []).filter(
    (effect) => !onlyShared || effect.shared,
  );

  const flashRing =
    flash === 'damage'
      ? 'ring-2 ring-[#ff0055]/30 shadow-[inset_0_0_10px_rgba(255,0,85,0.2)]'
      : flash === 'heal'
        ? 'ring-2 ring-[#00ff88]/30 shadow-[inset_0_0_10px_rgba(0,255,136,0.2)]'
        : '';

  const mainTrack = (
    <BarTrack
      value={bar.currentValue}
      max={bar.maxValue}
      color={activeColor}
      vertical={isVertical}
      readOnly={readOnly}
      onChange={(value) => onChangeValue(bar, value)}
      label={`Punti ferita di ${bar.name}`}
      alert={inAlert}
      className={isVertical ? 'min-w-0 flex-1' : 'w-full'}
      trackClassName={flashRing}
    />
  );

  const resourceTrack = (resource: Resource, className: string) => (
    <BarTrack
      key={resource.id}
      value={resource.currentValue}
      max={resource.maxValue}
      color={getBarColor(resource)}
      vertical={isVertical}
      thin
      readOnly={readOnly || !onChangeResource}
      onChange={
        onChangeResource ? (value) => onChangeResource(bar, resource, value) : undefined
      }
      label={`${resource.name} di ${bar.name}`}
      className={className}
    />
  );

  // Targhette col nome esteso, per la scheda larga.
  const effectPills = statusEffects.length > 0 && (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {statusEffects.map((effect) => (
        <span
          key={effect.id}
          title={effect.name}
          className="inline-flex max-w-[8rem] items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{
            color: effect.color,
            borderColor: `${effect.color}66`,
            backgroundColor: `${effect.color}1f`,
          }}
        >
          <span className="truncate">{effect.name}</span>
        </span>
      ))}
    </div>
  );

  // Solo iniziali, per la colonna verticale dove non c'è spazio per un nome.
  const effectDots = statusEffects.length > 0 && (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-0.5">
      {statusEffects.map((effect) => (
        <Tooltip key={effect.id} label={effect.name}>
          <span
            className="flex h-4 min-w-4 items-center justify-center rounded px-0.5 text-[8px] font-bold"
            style={{ color: effect.color, backgroundColor: `${effect.color}26` }}
          >
            {statusInitials(effect.name)}
          </span>
        </Tooltip>
      ))}
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
        className={`relative flex ${VERTICAL_SIZE[resources.length]} shrink-0 flex-row items-stretch gap-1 rounded-xl border border-bento-border bg-bento-bg p-1.5 transition-colors duration-200 ${
          readOnly ? '' : 'hover:border-slate-600'
        } ${shaking ? 'health-shake' : ''}`}
      >
        {/* Il nome occupa lo spazio che avanza e si adatta all'altezza reale.
            Prima era bloccato a `max-h-[140px]`, quindi su barre più alte
            restava troncato senza motivo. */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <span
            className="max-h-full truncate font-display text-[11px] leading-none font-bold uppercase tracking-wider text-slate-200 [writing-mode:vertical-rl] rotate-180 sm:text-[12px] lg:text-[13px]"
            title={bar.name}
          >
            {bar.name}
          </span>
        </div>

        <div
          className={`flex ${VERTICAL_COLUMN[resources.length]} shrink-0 flex-col items-center`}
        >
          {/* In verticale gli effetti non hanno spazio per un nome: solo le
              iniziali colorate, in cima. */}
          {effectDots && <div className="mb-1 w-full">{effectDots}</div>}

          {/* Le risorse affiancano la barra della vita: in verticale non c'è
              spazio per un'etichetta, quindi nome e valore stanno nel `title`
              e nell'etichetta accessibile della traccia. */}
          <div className="relative flex min-h-0 w-full flex-1 justify-center gap-[2px]">
            {mainTrack}
            {resources.map((resource) => resourceTrack(resource, 'w-[18px] shrink-0'))}
            {particleNodes}
          </div>

          <div className="mt-1 flex shrink-0 flex-col items-center font-mono text-[10px] leading-none text-slate-400">
            <div className="flex items-center whitespace-nowrap">
              <span className="text-[11px] font-bold text-slate-100">{bar.currentValue}</span>
              <span className="mx-[1px] text-slate-600">/</span>
              <span>{bar.maxValue}</span>
            </div>
            <span className="mt-0.5 text-[9px] font-bold text-slate-500">
              {Math.round(percentage)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={reorder ? (event) => event.preventDefault() : undefined}
      onDragEnter={reorder?.onDragEnter}
      onDrop={
        reorder
          ? (event) => {
              event.preventDefault();
              reorder.onDrop();
            }
          : undefined
      }
      onDragEnd={reorder?.onDragEnd}
      className={`group relative rounded-xl border bg-bento-bg p-3 transition-colors duration-200 sm:p-4 ${
        readOnly ? 'border-bento-border' : 'border-bento-border hover:border-slate-600'
      } ${reorder?.dragging ? 'opacity-30' : ''} ${
        reorder?.dragOver ? 'border-theme-500 ring-1 ring-theme-500/30' : ''
      } ${shaking ? 'health-shake' : ''}`}
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/* Maniglia di trascinamento: è l'UNICO elemento `draggable`, così il
              riordino non entra mai in conflitto col trascinamento degli HP
              sulla traccia. Visibile al passaggio del mouse, come i controlli. */}
          {reorder && (
            <span
              draggable
              onDragStart={reorder.onDragStart}
              aria-hidden
              className="touch-visible hidden shrink-0 cursor-grab text-slate-600 opacity-0 transition-opacity duration-200 hover:text-slate-300 active:cursor-grabbing group-hover:opacity-100 sm:block"
            >
              <GripVertical className="h-4 w-4" />
            </span>
          )}
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
              {reorder && (
                <>
                  <button
                    type="button"
                    aria-label={`Sposta ${bar.name} in alto`}
                    disabled={!reorder.canMoveUp}
                    onClick={() => {
                      playClickSound();
                      reorder.onMoveUp();
                    }}
                    className="rounded-lg p-1 text-slate-400 transition-colors duration-200 hover:bg-bento-button hover:text-slate-200 disabled:opacity-25"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Sposta ${bar.name} in basso`}
                    disabled={!reorder.canMoveDown}
                    onClick={() => {
                      playClickSound();
                      reorder.onMoveDown();
                    }}
                    className="rounded-lg p-1 text-slate-400 transition-colors duration-200 hover:bg-bento-button hover:text-slate-200 disabled:opacity-25"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <span className="mx-0.5 h-4 w-px bg-bento-border" />
                </>
              )}
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
                    onChangeValue(
                      bar,
                      Math.max(0, Math.min(bar.maxValue, bar.currentValue + delta)),
                    );
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
        {mainTrack}
        {particleNodes}
      </div>

      {effectPills}

      {resources.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {resources.map((resource) => (
            <div key={resource.id} className="flex items-center gap-2">
              <span
                className="w-14 shrink-0 truncate font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:w-20"
                title={resource.name}
              >
                {resource.name}
              </span>

              {resourceTrack(resource, 'min-w-0 flex-1')}

              <span className="shrink-0 font-mono text-[10px] tabular-nums text-slate-500">
                <span className="font-bold text-slate-300">{resource.currentValue}</span>
                <span className="mx-px text-slate-600">/</span>
                {resource.maxValue}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
