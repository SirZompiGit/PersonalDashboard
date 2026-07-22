/**
 * Immagini della campagna: sfondo e immagine di scena.
 *
 * Sono conservate in una chiave di localStorage a sé, NON dentro la campagna:
 * un'immagine in base64 dentro `CampaignState` verrebbe riscritta per intero a
 * ogni tasto premuto, sia su disco sia verso Firebase.
 *
 * Nelle stanze multiplayer viaggiano su un ramo separato del database
 * (`roomMedia/{pin}`), proprio per non farle transitare dalla sottoscrizione
 * della campagna, che si aggiorna di continuo.
 *
 * Chi è collegato a una stanza vede le immagini del MASTER: le proprie restano
 * salvate ma vengono messe da parte finché dura la sessione.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'fantasia_media';
/** Chiave usata prima che esistesse l'immagine di scena. */
const LEGACY_KEY = 'fantasia_background';
/**
 * Canale di sincronizzazione fra schede.
 *
 * Senza, la finestra dello schermo condiviso leggeva le immagini solo al
 * proprio avvio: caricandone una dopo averla aperta, lì non compariva nulla.
 * È lo stesso meccanismo che tiene allineata la campagna.
 */
const CHANNEL_NAME = 'fantasia_media_channel';

interface ChannelMessage {
  __fantasia: 'media';
  json: string;
}

/**
 * Lato massimo a cui le immagini vengono ridotte.
 * Senza questo limite una foto da telefono occuperebbe diversi megabyte in
 * localStorage — esaurendo la quota e impedendo il salvataggio della campagna —
 * e altrettanti in trasferimento verso ogni giocatore collegato.
 */
const MAX_DIMENSION = 1920;
const MAX_SCENE_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

/** Oltre questa dimensione l'immagine viene rifiutata con un messaggio. */
export const MAX_STORED_BYTES = 3 * 1024 * 1024;

export interface MediaSettings {
  /** Sfondo: URL remoto o immagine in base64. `null` = nessuno. */
  source: string | null;
  /** Sfondo ripetuto a mosaico, oppure adattato allo schermo. */
  repeat: boolean;
  /** Sfocatura dello sfondo, in pixel. */
  blur: number;
  /** Opacità dello sfondo, 0–1: senza un velo il testo diventa illeggibile. */
  opacity: number;
  /** Immagine di scena mostrata nella vista condivisa. `null` = nessuna. */
  scene: string | null;
}

export const DEFAULT_MEDIA: MediaSettings = {
  source: null,
  repeat: false,
  blur: 0,
  opacity: 0.55,
  scene: null,
};

/** Porta qualsiasi input a impostazioni valide. Non lancia mai. */
export function normalizeMedia(raw: unknown): MediaSettings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_MEDIA;
  const value = raw as Partial<MediaSettings>;

  return {
    source: typeof value.source === 'string' && value.source ? value.source : null,
    repeat: value.repeat === true,
    blur: Number.isFinite(value.blur) ? Math.min(40, Math.max(0, Number(value.blur))) : 0,
    opacity: Number.isFinite(value.opacity)
      ? Math.min(1, Math.max(0.05, Number(value.opacity)))
      : DEFAULT_MEDIA.opacity,
    scene: typeof value.scene === 'string' && value.scene ? value.scene : null,
  };
}

function read(): MediaSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    return raw ? normalizeMedia(JSON.parse(raw)) : DEFAULT_MEDIA;
  } catch {
    return DEFAULT_MEDIA;
  }
}

/**
 * Riduce l'immagine prima di conservarla.
 * Ridisegnandola su canvas e riesportandola in JPEG, una foto da 6 MB scende
 * tipicamente sotto i 400 KB.
 */
export function prepareImage(file: File, maxSide = MAX_DIMENSION): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);

      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
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

/** L'immagine di scena occupa un riquadro piccolo: non serve a piena risoluzione. */
export const prepareScene = (file: File) => prepareImage(file, MAX_SCENE_DIMENSION);

export interface UseMediaResult {
  /** Impostazioni in vigore: quelle del master se si è in una stanza. */
  media: MediaSettings;
  /** Impostazioni proprie, modificabili. */
  local: MediaSettings;
  /** True quando si stanno vedendo le immagini di qualcun altro. */
  isRemote: boolean;
  setMedia: (next: Partial<MediaSettings>) => void;
  clearBackground: () => void;
  clearScene: () => void;
  /**
   * Adotta le immagini ricevute dalla stanza. `null` torna alle proprie.
   * Accetta un valore grezzo perché arriva direttamente dal database.
   */
  applyRemote: (remote: unknown) => void;
  error: string | null;
}

export function useMedia(): UseMediaResult {
  const [local, setLocal] = useState<MediaSettings>(read);
  const [remote, setRemote] = useState<MediaSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Ultima serializzazione scritta o ricevuta: taglia gli echi fra schede. */
  const lastSyncedRef = useRef<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const media = remote ?? local;

  // Ascolto delle altre schede. La finestra dello schermo condiviso è una di
  // queste: è così che vede le immagini caricate dopo la sua apertura.
  useEffect(() => {
    const adopt = (json: string) => {
      if (json === lastSyncedRef.current) return;
      lastSyncedRef.current = json;
      try {
        setLocal(normalizeMedia(JSON.parse(json)));
      } catch {
        /* messaggio illeggibile: si ignora */
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) adopt(event.newValue);
    };
    window.addEventListener('storage', onStorage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;
      channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
        if (event.data?.__fantasia === 'media') adopt(event.data.json);
      };
    } catch (e) {
      console.warn('[fantasia] sincronizzazione immagini non disponibile:', e);
    }

    return () => {
      window.removeEventListener('storage', onStorage);
      channel?.close();
      channelRef.current = null;
    };
  }, []);

  // Le impostazioni viaggiano come variabili CSS su <html>: il livello di
  // sfondo è definito una volta sola in index.css e legge da lì.
  useEffect(() => {
    const root = document.documentElement;

    if (!media.source) {
      root.classList.remove('has-background');
      root.style.removeProperty('--bg-image');
      return;
    }

    root.classList.add('has-background');
    // Le virgolette proteggono gli URL con parentesi o spazi.
    root.style.setProperty('--bg-image', `url("${media.source}")`);
    root.style.setProperty('--bg-repeat', media.repeat ? 'repeat' : 'no-repeat');
    root.style.setProperty('--bg-size', media.repeat ? 'auto' : 'cover');
    root.style.setProperty('--bg-blur', `${media.blur}px`);
    root.style.setProperty('--bg-opacity', String(media.opacity));
  }, [media]);

  // Solo le proprie impostazioni vengono salvate: quelle ricevute dalla stanza
  // appartengono al master e non devono sovrascrivere le tue.
  useEffect(() => {
    const json = JSON.stringify(local);
    // Se è lo stato appena ricevuto da un'altra scheda, non va rimandato
    // indietro: due finestre se lo rimbalzerebbero all'infinito.
    if (json === lastSyncedRef.current) return;
    lastSyncedRef.current = json;

    try {
      localStorage.setItem(STORAGE_KEY, json);
      setError(null);
      channelRef.current?.postMessage({ __fantasia: 'media', json } satisfies ChannelMessage);
    } catch {
      setError(
        'Spazio del browser esaurito: le immagini non sono state salvate e spariranno al prossimo avvio.',
      );
    }
  }, [local]);

  const setMedia = useCallback((next: Partial<MediaSettings>) => {
    setLocal((current) => ({ ...current, ...next }));
  }, []);

  const clearBackground = useCallback(() => {
    setLocal((current) => ({
      ...current,
      source: null,
      repeat: false,
      blur: 0,
      opacity: DEFAULT_MEDIA.opacity,
    }));
  }, []);

  const clearScene = useCallback(() => setLocal((current) => ({ ...current, scene: null })), []);

  const applyRemote = useCallback((next: unknown) => {
    // `null` significa "nessuna immagine condivisa": si torna alle proprie.
    // Qualsiasi altro valore viene normalizzato, quindi anche un dato corrotto
    // sul database non può rompere nulla.
    setRemote(next === null || next === undefined ? null : normalizeMedia(next));
  }, []);

  return useMemo(
    () => ({
      media,
      local,
      isRemote: remote !== null,
      setMedia,
      clearBackground,
      clearScene,
      applyRemote,
      error,
    }),
    [media, local, remote, setMedia, clearBackground, clearScene, applyRemote, error],
  );
}
