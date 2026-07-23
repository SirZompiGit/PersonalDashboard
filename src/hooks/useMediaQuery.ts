import { useEffect, useState } from 'react';

/**
 * Osserva una media query.
 *
 * Serve dove la differenza fra due layout non è solo di stile ma di struttura,
 * e quindi non si può esprimere con le sole classi responsive: le barre vita
 * orizzontali e verticali sono due alberi di elementi diversi.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Sotto questa soglia la vista verticale delle barre non è leggibile. */
export const NARROW_SCREEN = '(max-width: 639px)';
