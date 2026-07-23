/**
 * Blocco appunti con espansione a tutto schermo, ricerca e copia.
 *
 * Prima esisteva in due copie quasi identiche dentro CampaignHeader — una per
 * gli appunti del master e una per quelli della campagna — per circa 180 righe
 * duplicate. La versione degli appunti campagna, per giunta, ricalcolava il
 * filtro delle righe quattro volte nello stesso render.
 */

import { type ReactNode, useMemo, useState } from 'react';
import { BookOpen, Check, Copy, Maximize2, Search, X } from 'lucide-react';
import { Modal } from './Modal';
import { IconButton } from './IconButton';

interface NotesPanelProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Altezza dell'area di testo in linea. */
  rows?: number;
  badge?: ReactNode;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;

  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  return (
    <span>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="rounded-sm bg-amber-500/35 px-1 font-bold text-amber-200">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </span>
  );
}

export function NotesPanel({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  badge,
}: NotesPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // L'icona segue il tema: l'`emerald` fisso era l'unico elemento
  // dell'intestazione a ignorare il colore scelto. La distinzione privati/
  // pubblici resta affidata all'etichetta di testo.
  const iconColor = 'text-theme-500';

  // Prima questo filtro veniva ricalcolato a ogni riferimento, quattro volte
  // per render solo per mostrare il conteggio dei risultati.
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return value.split('\n').filter((line) => line.toLowerCase().includes(needle));
  }, [value, query]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.warn('[fantasia] copia negli appunti non riuscita:', error);
    }
  };

  const textarea = (expandedView: boolean) => (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={label}
      rows={expandedView ? undefined : rows}
      className={`w-full resize-y rounded-lg border border-bento-border bg-bento-bg p-3 font-sans leading-relaxed text-slate-200 placeholder-slate-600 transition-colors duration-200 focus:border-theme-500 focus:outline-none focus:ring-1 focus:ring-theme-500/20 ${
        expandedView ? 'min-h-0 flex-1 p-4 text-sm' : 'text-xs'
      }`}
    />
  );

  return (
    <div className="flex w-full flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <BookOpen className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} />
          <span className="truncate">{label}</span>
          {badge}
        </span>

        <IconButton
          label="Espandi a tutto schermo"
          onClick={() => setExpanded(true)}
          tip="left"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </IconButton>
      </div>

      {textarea(false)}

      <Modal
        open={expanded}
        onClose={() => setExpanded(false)}
        title={
          <>
            <BookOpen className={`h-4 w-4 ${iconColor}`} />
            {label}
          </>
        }
        toolbar={
          <>
            <div className="flex min-w-0 flex-1 items-center rounded-lg border border-bento-border bg-bento-bg px-2 py-1.5 transition-colors duration-200 focus-within:border-slate-500 sm:w-56 sm:flex-none">
              <Search className="mr-1.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
              <input
                type="search"
                placeholder="Cerca negli appunti..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full min-w-0 bg-transparent font-sans text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Cancella ricerca"
                  className="shrink-0 p-0.5 text-slate-500 transition-colors duration-200 hover:text-slate-300"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-bento-border bg-bento-button px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors duration-200 hover:bg-bento-border hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiato</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copia
                </>
              )}
            </button>
          </>
        }
      >
        <div className="relative flex min-h-0 flex-1 flex-col">
          {textarea(true)}

          {query.trim() && (
            <div className="absolute inset-x-3 bottom-3 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-bento-border bg-bento-void/95 p-3 shadow-overlay backdrop-blur animate-fade-in">
              <div className="flex items-center justify-between border-b border-bento-border/40 pb-2 font-mono text-[11px] uppercase text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-amber-500" /> Risultati
                </span>
                <span>
                  {matches.length} {matches.length === 1 ? 'riga trovata' : 'righe trovate'}
                </span>
              </div>

              {matches.length === 0 ? (
                <p className="text-xs italic text-slate-600">
                  Nessun risultato per &ldquo;{query}&rdquo;.
                </p>
              ) : (
                <div className="space-y-2">
                  {matches.map((line, index) => (
                    <p
                      key={index}
                      className="rounded border border-bento-border/40 bg-bento-panel/60 p-2 font-sans text-xs leading-relaxed text-slate-300"
                    >
                      <Highlighted text={line} query={query} />
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
