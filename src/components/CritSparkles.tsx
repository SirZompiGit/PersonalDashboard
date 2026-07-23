/**
 * Scintille del successo critico.
 *
 * Prima esistevano in due versioni diverse: puntini colorati nel pannello dei
 * dadi e stelline nello schermo condiviso. Ora è un unico effetto, così il
 * critico si riconosce allo stesso modo ovunque lo si guardi.
 *
 * Le particelle nascono al montaggio e non cambiano più: le posizioni stanno in
 * un `useMemo` senza dipendenze, e il chiamante rigenera l'effetto rimontando
 * il componente con una `key` nuova. Nessun timer, nessuno stato da ripulire.
 */

import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { CRITICAL_COLOR } from './DiceShape';

interface CritSparklesProps {
  /** Quante scintille. */
  count?: number;
  /** Raggio massimo di dispersione, in pixel. */
  spread?: number;
  color?: string;
}

export function CritSparkles({
  count = 16,
  spread = 130,
  color = CRITICAL_COLOR,
}: CritSparklesProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        // Distribuzione a raggiera con una leggera irregolarità: allineate
        // perfettamente sembrerebbero un ingranaggio, non una scintilla.
        const angle = (index / count) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
        const distance = spread * (0.45 + Math.random() * 0.55);
        return {
          id: index,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 20,
          size: 0.75 + Math.random() * 0.5,
          delay: Math.random() * 0.12,
        };
      }),
    [count, spread],
  );

  return (
    <>
      {particles.map((particle) => (
        <div
          key={particle.id}
          aria-hidden
          className="dice-particle pointer-events-none absolute top-1/2 left-1/2 z-50"
          style={
            {
              '--ox': `${particle.x}px`,
              '--oy': `${particle.y}px`,
              color,
              animationDelay: `${particle.delay}s`,
            } as React.CSSProperties
          }
        >
          <Sparkles
            className="opacity-90"
            style={{
              width: `${particle.size}rem`,
              height: `${particle.size}rem`,
              filter: `drop-shadow(0 0 6px ${color})`,
            }}
          />
        </div>
      ))}
    </>
  );
}
