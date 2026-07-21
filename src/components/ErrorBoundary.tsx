/**
 * Rete di sicurezza contro gli errori di render.
 *
 * Prima non esisteva: qualunque eccezione durante il render — un JSON importato
 * malformato, un campo mancante — lasciava semplicemente uno schermo bianco,
 * senza spiegazioni e senza via d'uscita.
 *
 * Qui l'errore viene mostrato, ed è possibile scaricare i propri dati prima di
 * fare qualsiasi altra cosa.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

const STORAGE_KEY = 'fantasia_campaign_master_state';

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[fantasia] errore non gestito:', error, info.componentStack);
  }

  /** Scarica lo stato grezzo così com'è, senza passare per il render rotto. */
  private downloadRawState = (): void => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? '{}';
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'fantasia_recupero.json';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[fantasia] recupero dati fallito:', error);
    }
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-bento-bg p-4 font-sans">
        <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-bento-panel p-6 shadow-overlay sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h1 className="font-display text-xl font-black uppercase tracking-wider text-slate-100">
              Qualcosa si è rotto
            </h1>
          </div>

          <p className="mb-4 text-sm leading-relaxed text-slate-400">
            Fantasia ha incontrato un errore imprevisto. La tua campagna è ancora salvata nel
            browser: scaricala prima di ricaricare, così non rischi di perderla.
          </p>

          <pre className="mb-5 max-h-32 overflow-auto rounded-lg border border-bento-border bg-bento-void p-3 font-mono text-[11px] leading-relaxed text-red-300">
            {error.message}
          </pre>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={this.downloadRawState}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-bento-border bg-bento-button px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-200 transition-colors duration-200 hover:bg-bento-border"
            >
              <Download className="h-4 w-4" />
              Scarica i dati
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-theme-500 bg-theme-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-raised transition-colors duration-200 hover:bg-theme-500"
            >
              <RefreshCw className="h-4 w-4" />
              Ricarica
            </button>
          </div>
        </div>
      </div>
    );
  }
}
