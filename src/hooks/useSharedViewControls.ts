/**
 * Controlli di presentazione della vista condivisa: schermo intero e scala del
 * testo.
 *
 * La vista condivisa vive su un proiettore o su un secondo monitor, a distanze
 * molto diverse da quella di una scrivania: la dimensione giusta del testo non
 * è la stessa. La scala viene ricordata, così non va rifatta a ogni sessione.
 */

import { useCallback, useEffect, useState } from 'react';

const ZOOM_KEY = 'fantasia_shared_zoom';

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1.6;
const STEP = 0.1;

const clamp = (value: number) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));

export interface SharedViewControls {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  fullscreenAvailable: boolean;
}

export function useSharedViewControls(): SharedViewControls {
  const [zoom, setZoom] = useState(() => {
    try {
      const saved = Number.parseFloat(localStorage.getItem(ZOOM_KEY) ?? '');
      return Number.isFinite(saved) ? clamp(saved) : 1;
    } catch {
      return 1;
    }
  });

  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && document.fullscreenElement !== null,
  );

  useEffect(() => {
    try {
      localStorage.setItem(ZOOM_KEY, String(zoom));
    } catch {
      /* preferenza non essenziale */
    }
  }, [zoom]);

  // Lo stato va osservato, non dedotto: si esce dallo schermo intero anche con
  // Esc o dai controlli del browser, senza passare dal nostro pulsante.
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((e) => console.warn('[fantasia] uscita a schermo intero:', e));
    } else {
      document.documentElement
        .requestFullscreen()
        .catch((e) => console.warn('[fantasia] schermo intero non disponibile:', e));
    }
  }, []);

  return {
    zoom,
    zoomIn: useCallback(() => setZoom((z) => clamp(z + STEP)), []),
    zoomOut: useCallback(() => setZoom((z) => clamp(z - STEP)), []),
    resetZoom: useCallback(() => setZoom(1), []),
    canZoomIn: zoom < MAX_ZOOM,
    canZoomOut: zoom > MIN_ZOOM,
    isFullscreen,
    toggleFullscreen,
    fullscreenAvailable:
      typeof document !== 'undefined' && Boolean(document.documentElement.requestFullscreen),
  };
}
