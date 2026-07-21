/**
 * Sfondo personalizzato.
 *
 * Vive in una chiave di localStorage a sé, NON dentro la campagna. Tre motivi:
 *  - non gonfia il file esportato né l'import;
 *  - non viene trasmesso a Firebase a ogni modifica, dove un'immagine in base64
 *    sarebbe riscritta per intero a ogni tasto premuto;
 *  - resta una preferenza del dispositivo, giusta perché lo schermo condiviso
 *    è spesso un altro monitor con esigenze diverse.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'fantasia_background';

/**
 * Lato massimo a cui le immagini caricate vengono ridotte.
 * Senza questo limite una foto da telefono occuperebbe diversi megabyte in
 * localStorage, esaurendo la quota e impedendo il salvataggio della campagna.
 */
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

/** Oltre questa dimensione il salvataggio viene rifiutato con un messaggio. */
export const MAX_STORED_BYTES = 3 * 1024 * 1024;

export interface BackgroundSettings {
  /** URL remoto o immagine in base64. `null` = nessuno sfondo. */
  source: string | null;
  /** Ripetuto a mosaico, oppure adattato allo schermo. */
  repeat: boolean;
  /** Sfocatura in pixel. */
  blur: number;
  /** Opacità 0–1: senza un po' di velo il testo diventa illeggibile. */
  opacity: number;
}

export const DEFAULT_BACKGROUND: BackgroundSettings = {
  source: null,
  repeat: false,
  blur: 0,
  opacity: 0.55,
};

function read(): BackgroundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BACKGROUND;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_BACKGROUND;

    const value = parsed as Partial<BackgroundSettings>;
    return {
      source: typeof value.source === 'string' && value.source ? value.source : null,
      repeat: value.repeat === true,
      blur: Number.isFinite(value.blur) ? Math.min(40, Math.max(0, Number(value.blur))) : 0,
      opacity: Number.isFinite(value.opacity)
        ? Math.min(1, Math.max(0.05, Number(value.opacity)))
        : DEFAULT_BACKGROUND.opacity,
    };
  } catch {
    return DEFAULT_BACKGROUND;
  }
}

/**
 * Riduce l'immagine prima di conservarla.
 * Ridisegnandola su un canvas al massimo a 1920px e riesportandola in JPEG, una
 * foto da 6 MB scende tipicamente sotto i 400 KB.
 */
export function prepareImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);

      const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error("Impossibile elaborare l'immagine in questo browser."));
        return;
      }

      context.drawImage(image, 0, 0, width, height);

      // I PNG con trasparenza perderebbero il canale alfa in JPEG: si tiene il
      // formato originale solo quando serve davvero.
      const useJpeg = file.type !== 'image/png';
      const data = canvas.toDataURL(useJpeg ? 'image/jpeg' : 'image/png', JPEG_QUALITY);

      if (data.length > MAX_STORED_BYTES) {
        reject(new Error("L'immagine è troppo pesante anche dopo la riduzione."));
        return;
      }

      resolve(data);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('File immagine non leggibile.'));
    };

    image.src = url;
  });
}

export interface UseBackgroundResult {
  background: BackgroundSettings;
  setBackground: (next: Partial<BackgroundSettings>) => void;
  clearBackground: () => void;
  error: string | null;
}

export function useBackground(): UseBackgroundResult {
  const [background, setState] = useState<BackgroundSettings>(read);
  const [error, setError] = useState<string | null>(null);

  // Le impostazioni viaggiano come variabili CSS su <html>: il livello di
  // sfondo è definito una volta sola in index.css e legge da lì.
  useEffect(() => {
    const root = document.documentElement;

    if (!background.source) {
      root.classList.remove('has-background');
      root.style.removeProperty('--bg-image');
      return;
    }

    root.classList.add('has-background');
    // Le virgolette proteggono gli URL con parentesi o spazi.
    root.style.setProperty('--bg-image', `url("${background.source}")`);
    root.style.setProperty('--bg-repeat', background.repeat ? 'repeat' : 'no-repeat');
    root.style.setProperty('--bg-size', background.repeat ? 'auto' : 'cover');
    root.style.setProperty('--bg-blur', `${background.blur}px`);
    root.style.setProperty('--bg-opacity', String(background.opacity));
  }, [background]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(background));
      setError(null);
    } catch {
      setError(
        'Spazio del browser esaurito: lo sfondo non è stato salvato e sparirà al prossimo avvio.',
      );
    }
  }, [background]);

  const setBackground = useCallback((next: Partial<BackgroundSettings>) => {
    setState((current) => ({ ...current, ...next }));
  }, []);

  const clearBackground = useCallback(() => {
    setState(DEFAULT_BACKGROUND);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* niente da fare: la rimozione visiva è comunque avvenuta */
    }
  }, []);

  return { background, setBackground, clearBackground, error };
}
