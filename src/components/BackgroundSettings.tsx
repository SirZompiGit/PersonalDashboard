/**
 * Controlli dello sfondo personalizzato, dentro il pannello Impostazioni.
 * L'immagine può arrivare da un file locale o da un indirizzo web.
 */

import { useRef, useState } from 'react';
import { Image as ImageIcon, Link2, Trash2, Upload } from 'lucide-react';
import {
  type BackgroundSettings as Settings,
  prepareImage,
} from '../hooks/useBackground';

interface BackgroundSettingsProps {
  background: Settings;
  onChange: (next: Partial<Settings>) => void;
  onClear: () => void;
  storageError: string | null;
}

const SLIDER =
  'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-bento-button accent-theme-500';

export function BackgroundSettings({
  background,
  onChange,
  onClear,
  storageError,
}: BackgroundSettingsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      // L'immagine viene ridotta prima di essere conservata: una foto da
      // telefono esaurirebbe da sola lo spazio del browser.
      const data = await prepareImage(file);
      onChange({ source: data });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Immagine non caricata.');
    } finally {
      setBusy(false);
    }
  };

  const applyUrl = () => {
    const url = urlDraft.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setError('Inserisci un indirizzo che inizi con http:// o https://');
      return;
    }
    setError(null);
    onChange({ source: url });
    setUrlDraft('');
  };

  return (
    <div className="space-y-3 border-t border-bento-border pt-3">
      <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <ImageIcon className="h-3.5 w-3.5 text-theme-500" /> Sfondo
      </span>

      {background.source && (
        <div className="flex items-center gap-2 rounded-lg border border-bento-border bg-bento-panel p-2">
          <span
            className="h-10 w-16 shrink-0 rounded border border-bento-border bg-bento-bg bg-cover bg-center"
            style={{ backgroundImage: `url("${background.source}")` }}
          />
          <span className="min-w-0 flex-1 truncate text-[11px] text-slate-400">
            {background.source.startsWith('data:')
              ? 'Immagine caricata'
              : background.source}
          </span>
          <button
            type="button"
            onClick={onClear}
            aria-label="Rimuovi sfondo"
            className="shrink-0 rounded p-1.5 text-slate-400 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex gap-1.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void handleFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-bento-border bg-bento-button px-2 py-2 text-[11px] font-semibold text-slate-200 transition-colors duration-200 hover:bg-bento-border disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {busy ? 'Elaboro...' : 'Carica'}
        </button>
      </div>

      <div className="flex gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-bento-border bg-bento-panel px-2">
          <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <input
            type="url"
            placeholder="oppure incolla un indirizzo"
            value={urlDraft}
            onChange={(event) => setUrlDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyUrl();
              }
            }}
            aria-label="Indirizzo dell'immagine di sfondo"
            className="w-full min-w-0 bg-transparent py-2 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={applyUrl}
          disabled={!urlDraft.trim()}
          className="shrink-0 rounded-lg bg-theme-600 px-2.5 text-[11px] font-semibold text-white transition-colors duration-200 hover:bg-theme-500 disabled:opacity-40"
        >
          Usa
        </button>
      </div>

      {(error || storageError) && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/20 px-2 py-1.5 text-[10px] leading-snug text-red-300">
          {error ?? storageError}
        </p>
      )}

      {background.source && (
        <div className="space-y-2.5 rounded-lg border border-bento-border bg-bento-panel/40 p-2.5">
          <label className="flex cursor-pointer items-center justify-between gap-2 select-none">
            <span className="text-[11px] text-slate-300">Ripeti a mosaico</span>
            <input
              type="checkbox"
              checked={background.repeat}
              onChange={(event) => onChange({ repeat: event.target.checked })}
              className="h-4 w-4 accent-theme-500"
            />
          </label>

          <label className="block space-y-1">
            <span className="flex items-center justify-between text-[11px] text-slate-300">
              Sfocatura
              <span className="font-mono text-[10px] text-slate-500">
                {background.blur}px
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={background.blur}
              onChange={(event) => onChange({ blur: Number(event.target.value) })}
              className={SLIDER}
            />
          </label>

          <label className="block space-y-1">
            <span className="flex items-center justify-between text-[11px] text-slate-300">
              Intensità
              <span className="font-mono text-[10px] text-slate-500">
                {Math.round(background.opacity * 100)}%
              </span>
            </span>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={Math.round(background.opacity * 100)}
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
  );
}
