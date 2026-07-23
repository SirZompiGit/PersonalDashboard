/**
 * Immagini della campagna, dentro il pannello Impostazioni.
 *
 *  - **Sfondo**: sta dietro tutta l'interfaccia, con ripetizione, sfocatura e
 *    intensità regolabili.
 *  - **Scena**: compare in un riquadro sotto l'ordine di turno nella vista
 *    condivisa. Se non c'è, quel riquadro non esiste affatto.
 *
 * In una stanza multiplayer entrambe vengono trasmesse ai giocatori.
 */

import { useRef, useState } from 'react';
import { Image as ImageIcon, Link2, Projector, Trash2, Upload } from 'lucide-react';
import {
  LARGE_IMAGE_BYTES,
  type MediaSettings as Settings,
  prepareImage,
  prepareScene,
} from '../hooks/useMedia';

interface MediaSettingsProps {
  media: Settings;
  onChange: (next: Partial<Settings>) => void;
  onClearBackground: () => void;
  onClearScene: () => void;
  storageError: string | null;
  /** True quando si stanno vedendo le immagini del master, non le proprie. */
  isRemote: boolean;
  /** True quando le immagini vengono trasmesse ai giocatori collegati. */
  isSharing: boolean;
}

const SLIDER =
  'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-bento-button accent-theme-500';

const ACTION =
  'flex items-center justify-center gap-1.5 rounded-lg border border-bento-border bg-bento-button px-2 py-2 text-[11px] font-semibold text-slate-200 transition-colors duration-200 hover:bg-bento-border disabled:opacity-50';

export function MediaSettings({
  media,
  onChange,
  onClearBackground,
  onClearScene,
  storageError,
  isRemote,
  isSharing,
}: MediaSettingsProps) {
  const bgFileRef = useRef<HTMLInputElement>(null);
  const sceneFileRef = useRef<HTMLInputElement>(null);
  const [bgUrl, setBgUrl] = useState('');
  const [sceneUrl, setSceneUrl] = useState('');
  const [busy, setBusy] = useState<'background' | 'scene' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const load = async (file: File, target: 'background' | 'scene') => {
    setBusy(target);
    setError(null);
    setWarning(null);
    try {
      // L'immagine viene ridotta prima di essere conservata: una foto da
      // telefono esaurirebbe da sola lo spazio del browser, e in una stanza
      // andrebbe scaricata da ogni giocatore.
      const data =
        target === 'scene' ? await prepareScene(file) : await prepareImage(file);

      // Sopra i 2 MB si passa lo stesso, ma vale la pena saperlo: lo spazio
      // del browser è di una decina di megabyte in tutto, campagna compresa.
      if (data.length > LARGE_IMAGE_BYTES) {
        setWarning(
          `Immagine pesante (${(data.length / 1024 / 1024).toFixed(1)} MB). Funziona, ma ` +
            'occupa buona parte dello spazio del browser e in una stanza ogni giocatore ' +
            'la scarica. Un JPEG al posto di un PNG pesa molto meno.',
        );
      }

      onChange(target === 'scene' ? { scene: data } : { source: data });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Immagine non caricata.');
    } finally {
      setBusy(null);
    }
  };

  const applyUrl = (target: 'background' | 'scene') => {
    const url = (target === 'scene' ? sceneUrl : bgUrl).trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setError('Inserisci un indirizzo che inizi con http:// o https://');
      return;
    }
    setError(null);
    onChange(target === 'scene' ? { scene: url } : { source: url });
    if (target === 'scene') setSceneUrl('');
    else setBgUrl('');
  };

  /** Campo per incollare un indirizzo, uguale per sfondo e scena. */
  const urlField = (
    target: 'background' | 'scene',
    value: string,
    setValue: (v: string) => void,
  ) => (
    <div className="flex gap-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-bento-border bg-bento-panel px-2">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        <input
          type="url"
          placeholder="oppure incolla un indirizzo"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              applyUrl(target);
            }
          }}
          aria-label={
            target === 'scene'
              ? "Indirizzo dell'immagine di scena"
              : "Indirizzo dell'immagine di sfondo"
          }
          className="w-full min-w-0 bg-transparent py-2 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none"
        />
      </div>
      <button
        type="button"
        onClick={() => applyUrl(target)}
        disabled={!value.trim()}
        className="shrink-0 rounded-lg bg-theme-600 px-2.5 text-[11px] font-semibold text-white transition-colors duration-200 hover:bg-theme-500 disabled:opacity-40"
      >
        Usa
      </button>
    </div>
  );

  const preview = (src: string, onRemove: () => void, label: string) => (
    <div className="flex items-center gap-2 rounded-lg border border-bento-border bg-bento-panel p-2">
      <span
        className="h-10 w-16 shrink-0 rounded border border-bento-border bg-bento-bg bg-cover bg-center"
        style={{ backgroundImage: `url("${src}")` }}
      />
      <span className="min-w-0 flex-1 truncate text-[11px] text-slate-400">
        {src.startsWith('data:') ? label : src}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Rimuovi ${label.toLowerCase()}`}
        className="shrink-0 rounded p-1.5 text-slate-400 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="space-y-4 border-t border-bento-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <ImageIcon className="h-3.5 w-3.5 text-theme-500" /> Immagini
        </span>
        {isSharing && (
          <span className="rounded-full bg-theme-600/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-theme-400">
            Condivise
          </span>
        )}
      </div>

      {isRemote && (
        <p className="rounded-lg border border-bento-border bg-bento-panel/50 px-2 py-1.5 text-[10px] leading-snug text-slate-400">
          Stai vedendo le immagini scelte dal master. Le tue restano salvate e
          tornano quando esci dalla stanza.
        </p>
      )}

      {/* ---------------------------------------------------------------- Sfondo */}
      <div className="space-y-2">
        <span className="block text-[11px] font-semibold text-slate-300">Sfondo</span>

        {media.source && preview(media.source, onClearBackground, 'Immagine caricata')}

        <input
          ref={bgFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void load(file, 'background');
          }}
        />

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => bgFileRef.current?.click()}
            disabled={busy !== null}
            className={`${ACTION} flex-1`}
          >
            <Upload className="h-3.5 w-3.5" />
            {busy === 'background' ? 'Elaboro...' : 'Carica'}
          </button>
        </div>

        {urlField('background', bgUrl, setBgUrl)}

        {media.source && (
          <div className="space-y-2.5 rounded-lg border border-bento-border bg-bento-panel/40 p-2.5">
            <label className="flex cursor-pointer items-center justify-between gap-2 select-none">
              <span className="text-[11px] text-slate-300">Ripeti a mosaico</span>
              <input
                type="checkbox"
                checked={media.repeat}
                onChange={(event) => onChange({ repeat: event.target.checked })}
                className="h-4 w-4 accent-theme-500"
              />
            </label>

            <label className="block space-y-1">
              <span className="flex items-center justify-between text-[11px] text-slate-300">
                Sfocatura
                <span className="font-mono text-[10px] text-slate-500">{media.blur}px</span>
              </span>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={media.blur}
                onChange={(event) => onChange({ blur: Number(event.target.value) })}
                className={SLIDER}
              />
            </label>

            <label className="block space-y-1">
              <span className="flex items-center justify-between text-[11px] text-slate-300">
                Intensità
                <span className="font-mono text-[10px] text-slate-500">
                  {Math.round(media.opacity * 100)}%
                </span>
              </span>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={Math.round(media.opacity * 100)}
                onChange={(event) => onChange({ opacity: Number(event.target.value) / 100 })}
                className={SLIDER}
              />
            </label>

            <p className="text-[10px] leading-snug text-slate-600">
              Abbassa l&apos;intensità o alza la sfocatura se il testo diventa faticoso da
              leggere.
            </p>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- Scena */}
      <div className="space-y-2 border-t border-bento-border/50 pt-3">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
          <Projector className="h-3.5 w-3.5 text-slate-500" /> Immagine di scena
        </span>
        <p className="text-[10px] leading-snug text-slate-600">
          Compare sotto l&apos;ordine di turno nella vista condivisa. Utile per mostrare una
          mappa, un ritratto o un indizio.
        </p>

        {media.scene && preview(media.scene, onClearScene, 'Scena caricata')}

        <input
          ref={sceneFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void load(file, 'scene');
          }}
        />

        <button
          type="button"
          onClick={() => sceneFileRef.current?.click()}
          disabled={busy !== null}
          className={`${ACTION} w-full`}
        >
          <Upload className="h-3.5 w-3.5" />
          {busy === 'scene' ? 'Elaboro...' : media.scene ? 'Sostituisci' : 'Carica scena'}
        </button>

        {urlField('scene', sceneUrl, setSceneUrl)}
      </div>

      {(error || storageError) && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/20 px-2 py-1.5 text-[10px] leading-snug text-red-300">
          {error ?? storageError}
        </p>
      )}

      {warning && !error && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-2 py-1.5 text-[10px] leading-snug text-amber-300">
          {warning}
        </p>
      )}
    </div>
  );
}
