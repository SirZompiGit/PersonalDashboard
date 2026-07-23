/**
 * Sagoma del dado, disegnata in SVG.
 *
 * Solo il profilo esterno: niente spigoli interni, che affollavano una forma
 * già piccola. Il numero è testo SVG dimensionato in unità del viewBox, non con
 * le classi di Tailwind: resta proporzionato alla sagoma qualunque sia la sua
 * dimensione, e non risente del rimpicciolimento che il design Retro applica a
 * `.font-display`.
 */

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { parseSides } from '../lib/dice';

/** Profili in coordinate del viewBox 100×100. */
const PROFILES: Record<number, string> = {
  3: '50,10 93,84 7,84',
  4: '50,8 93,84 7,84',
  6: '13,13 87,13 87,87 13,87',
  8: '50,5 91,50 50,95 9,50',
  10: '50,4 90,36 74,92 26,92 10,36',
  12: '50,5 93,36 77,88 23,88 7,36',
  20: '50,4 90,27 90,73 50,96 10,73 10,27',
};

const FALLBACK = PROFILES[6];

/** Dimensione nominale del testo: la scala effettiva viene calcolata dopo. */
const BASE_FONT = 46;

type Point = [number, number];

export const parsePoints = (points: string): Point[] =>
  points.split(' ').map((pair) => pair.split(',').map(Number) as Point);

/** Profili esposti per i test: garantiscono che ogni dado abbia una sagoma. */
export const DICE_PROFILES = PROFILES;

/**
 * Baricentro del poligono.
 *
 * Centrare il numero a 50,50 funziona solo per le sagome simmetriche: in un
 * triangolo finirebbe troppo in alto, fuori dalla massa della forma.
 */
export function centroid(points: Point[]): { x: number; y: number } {
  const sum = points.reduce((acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/**
 * Raggio del cerchio inscritto attorno al baricentro: la distanza dal lato più
 * vicino. È lo spazio davvero utilizzabile dal numero, e cambia moltissimo fra
 * una sagoma e l'altra — in un triangolo è quasi la metà che in un quadrato.
 */
export function inradius(points: Point[], center: { x: number; y: number }): number {
  let min = Infinity;

  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    if (length === 0) continue;

    // Le sagome sono convesse: basta la distanza dalla retta del lato.
    const distance = Math.abs(dy * center.x - dx * center.y + x2 * y1 - y2 * x1) / length;
    min = Math.min(min, distance);
  }

  return Number.isFinite(min) ? min : 30;
}

/**
 * Colori dell'esito. Non seguono il tema: un critico deve essere oro e un
 * fallimento rosso in qualunque palette, altrimenti in tema Druido il colpo
 * fortunato sarebbe verde come tutto il resto e smetterebbe di saltare
 * all'occhio.
 */
export const CRITICAL_COLOR = '#fbbf24';
export const FUMBLE_COLOR = '#ef4444';

export type DiceShapeState = 'idle' | 'rolling' | 'result';

/**
 * `full`   — numero pieno e visibile
 * `dimmed` — visibile ma spento: il master vede il proprio lancio nascosto
 * `hidden` — sostituito da `?`: è ciò che vedono i giocatori
 */
export type DiceReveal = 'full' | 'dimmed' | 'hidden';

interface DiceShapeProps {
  diceType: string;
  value: number | null;
  state: DiceShapeState;
  accent: string;
  reveal?: DiceReveal;
  outcome?: 'critical' | 'fumble' | null;
  className?: string;
}

export function DiceShape({
  diceType,
  value,
  state,
  accent,
  reveal = 'full',
  outcome = null,
  className = '',
}: DiceShapeProps) {
  const outlineText = PROFILES[parseSides(diceType)] ?? FALLBACK;

  const { center, radius } = useMemo(() => {
    const points = parsePoints(outlineText);
    const c = centroid(points);
    return { center: c, radius: inradius(points, c) };
  }, [outlineText]);

  const text = reveal === 'hidden' || value === null ? '?' : String(value);

  const textRef = useRef<SVGTextElement>(null);
  const [fit, setFit] = useState(1);

  /**
   * Il numero viene misurato e ridotto finché non sta dentro il cerchio
   * inscritto, con un margine dal bordo.
   *
   * Serve misurarlo davvero perché la larghezza dipende dal carattere, e i
   * design ne usano di molto diversi: Press Start 2P del tema Retro è quasi il
   * doppio più largo di Inter a parità di dimensione. Con una scala indovinata
   * a mano, il numero usciva dalla sagoma proprio lì.
   */
  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const measure = () => {
      const box = element.getBBox();
      if (!box.width || !box.height) return;

      // Un rettangolo di questi rapporti sta nel cerchio inscritto con margine:
      // la sua diagonale resta sotto il diametro.
      const maxWidth = radius * 1.45;
      const maxHeight = radius * 1.15;

      setFit(Math.min(1, maxWidth / box.width, maxHeight / box.height));
    };

    measure();

    // I caratteri arrivano dalla rete: prima che siano pronti la misura è
    // quella del carattere di ripiego, e sarebbe sbagliata.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });

    return () => {
      cancelled = true;
    };
  }, [text, radius, diceType]);

  const animation =
    state === 'rolling' ? 'dice-tumble' : state === 'result' ? 'dice-settle' : '';

  // Sagoma e numero prendono il colore dell'esito, quando c'è.
  const color =
    outcome === 'critical' ? CRITICAL_COLOR : outcome === 'fumble' ? FUMBLE_COLOR : accent;

  const textColor = outcome ? color : reveal === 'full' ? '#ffffff' : color;

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={
        state === 'rolling'
          ? `Lancio di un ${diceType} in corso`
          : reveal === 'hidden'
            ? `Risultato del ${diceType} nascosto`
            : `${diceType}: ${text}`
      }
      className={`${animation} ${className}`}
      style={{
        overflow: 'visible',
        // La rotazione gira attorno al baricentro, non al centro del riquadro.
        // Con `50% 50%` le sagome asimmetriche — i triangoli del d3 e del d4 —
        // ruotavano fuori asse, come una ruota storta.
        transformOrigin: `${center.x}% ${center.y}%`,
      }}
    >
      {/* Alone che stacca la sagoma dal fondo. Sta dietro, non dentro. */}
      <polygon
        points={outlineText}
        fill={color}
        opacity={outcome ? 0.34 : 0.18}
        style={{ filter: 'blur(7px)' }}
      />

      {/* Solo il profilo esterno. */}
      <polygon
        points={outlineText}
        fill={color}
        fillOpacity={outcome ? 0.16 : 0.1}
        stroke={color}
        strokeWidth={outcome ? 3.5 : 3}
        strokeLinejoin="round"
      />

      <text
        ref={textRef}
        x={0}
        y={0}
        transform={`translate(${center.x} ${center.y}) scale(${fit})`}
        textAnchor="middle"
        dominantBaseline="central"
        fill={textColor}
        fillOpacity={reveal === 'dimmed' ? 0.55 : 1}
        fontSize={BASE_FONT}
        fontWeight={800}
        style={{
          fontFamily: 'var(--font-display)',
          filter: reveal === 'dimmed' ? 'none' : `drop-shadow(0 0 8px ${color}90)`,
        }}
      >
        {text}
      </text>
    </svg>
  );
}
