/**
 * Scelta della modalità all'avvio.
 *
 * Interventi principali:
 *  - Quando Firebase non è configurato la Versione X viene disattivata con una
 *    spiegazione, invece di lasciar fallire la connessione più avanti con un
 *    errore incomprensibile.
 *  - Il giocatore sceglie il proprio nome subito, invece di ricevere
 *    "Utente 437" e doversi rinominare dopo essere entrato.
 *  - Gli errori compaiono nella schermata invece che in un `alert()` bloccante.
 */

import { type FormEvent, useState } from 'react';
import { AlertTriangle, ArrowRight, Shield, Sword, Users } from 'lucide-react';

interface WelcomeScreenProps {
  onSelectLite: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (pin: string, displayName: string) => void;
  isConnecting: boolean;
  multiplayerAvailable: boolean;
  error: string | null;
  onDismissError: () => void;
}

/** PIN passato via link d'invito (`?room=123456`). */
function readInvitedPin(): string {
  if (typeof window === 'undefined') return '';
  const value = new URLSearchParams(window.location.search).get('room') ?? '';
  return /^\d{6}$/.test(value) ? value : '';
}

export function WelcomeScreen({
  onSelectLite,
  onCreateRoom,
  onJoinRoom,
  isConnecting,
  multiplayerAvailable,
  error,
  onDismissError,
}: WelcomeScreenProps) {
  const [pin, setPin] = useState(readInvitedPin);
  const [displayName, setDisplayName] = useState('');
  const invited = pin.length === 6;

  const submitJoin = (event: FormEvent) => {
    event.preventDefault();
    if (pin.trim().length === 6) onJoinRoom(pin.trim(), displayName);
  };

  const disabled = isConnecting || !multiplayerAvailable;

  return (
    <div className="app-surface flex min-h-screen flex-col items-center justify-center gap-6 bg-bento-bg p-4 font-sans text-slate-100 sm:p-8">
      <header className="text-center">
        <h1 className="font-display text-3xl font-black uppercase tracking-[0.2em] text-slate-100 sm:text-4xl">
          Fantasia
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-slate-500">
          Plancia di comando per sessioni di gioco di ruolo
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex w-full max-w-4xl items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/30 p-4 animate-fade-in"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="flex-1 text-xs leading-relaxed text-red-200">{error}</p>
          <button
            type="button"
            onClick={onDismissError}
            className="shrink-0 text-xs font-bold uppercase text-red-400 transition-colors duration-200 hover:text-red-200"
          >
            Chiudi
          </button>
        </div>
      )}

      <div className="grid w-full max-w-4xl grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
        <button
          type="button"
          onClick={onSelectLite}
          className="group relative flex flex-col items-center overflow-hidden rounded-3xl border border-bento-border bg-bento-panel p-6 text-center shadow-overlay transition-colors duration-200 hover:border-slate-600 sm:p-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-radial from-emerald-500/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

          <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 transition-transform duration-200 group-hover:scale-110">
            <Sword className="h-8 w-8" />
          </span>

          <h2 className="mb-3 font-display text-xl font-black uppercase tracking-wider text-slate-100 sm:text-2xl">
            Versione Lite
          </h2>
          <p className="mb-6 flex-1 text-sm leading-relaxed text-slate-400">
            La dashboard classica, offline. Tutti i dati restano sul tuo dispositivo. Ideale per
            sessioni in presenza o se condividi lo schermo.
          </p>

          <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/10 py-3 text-sm font-bold uppercase tracking-wider text-emerald-400 transition-colors duration-200 group-hover:bg-emerald-500 group-hover:text-slate-900">
            Avvia Lite <ArrowRight className="h-4 w-4" />
          </span>
        </button>

        <div className="relative flex flex-col overflow-hidden rounded-3xl border border-bento-border bg-bento-panel p-6 shadow-overlay sm:p-8">
          <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-theme-500/20 bg-theme-500/10 text-theme-400">
            <Users className="h-8 w-8" />
          </span>

          <h2 className="mb-3 text-center font-display text-xl font-black uppercase tracking-wider text-slate-100 sm:text-2xl">
            Versione X
          </h2>
          <p className="mb-6 text-center text-sm leading-relaxed text-slate-400">
            Sessione condivisa in tempo reale. Il master gestisce la partita, i giocatori entrano
            con un PIN, tirano i dadi e hanno appunti privati.
          </p>

          {!multiplayerAvailable ? (
            <div className="mt-auto rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-center">
              <p className="text-xs leading-relaxed text-amber-300">
                Multiplayer non configurato. Copia{' '}
                <code className="rounded bg-bento-void px-1 py-0.5 font-mono">.env.example</code>{' '}
                in <code className="rounded bg-bento-void px-1 py-0.5 font-mono">.env</code>,
                inserisci le credenziali Firebase e riavvia il server.
              </p>
            </div>
          ) : (
            <div className="mt-auto space-y-4">
              <button
                type="button"
                onClick={onCreateRoom}
                disabled={disabled}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-theme-500/20 bg-theme-500/10 py-3 text-sm font-bold uppercase tracking-wider text-theme-400 transition-colors duration-200 hover:bg-theme-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isConnecting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                {isConnecting ? 'Connessione...' : 'Crea come Master'}
              </button>

              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-bento-border" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
                  oppure
                </span>
                <span className="h-px flex-1 bg-bento-border" />
              </div>

              <form onSubmit={submitJoin} className="space-y-2">
                {invited && (
                  <p className="rounded-lg border border-theme-500/30 bg-theme-600/10 px-3 py-2 text-center text-xs text-theme-400 animate-fade-in">
                    Sei stato invitato alla stanza <strong>{pin}</strong>. Scrivi il tuo nome ed
                    entra.
                  </p>
                )}

                <input
                  type="text"
                  placeholder="Il tuo nome"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={24}
                  aria-label="Il tuo nome"
                  autoFocus={invited}
                  className="w-full rounded-xl border border-bento-border bg-bento-item px-4 py-3 text-slate-200 transition-colors duration-200 placeholder:text-slate-600 focus:border-theme-500 focus:outline-none"
                />

                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="PIN a 6 cifre"
                    value={pin}
                    onChange={(event) =>
                      setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    maxLength={6}
                    aria-label="PIN della stanza"
                    className="min-w-0 flex-1 rounded-xl border border-bento-border bg-bento-item px-4 py-3 font-mono tracking-widest text-slate-200 transition-colors duration-200 placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-600 focus:border-theme-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={disabled || pin.length !== 6}
                    className="shrink-0 rounded-xl border border-bento-border bg-bento-button px-5 py-3 text-sm font-bold uppercase tracking-wider text-slate-200 transition-colors duration-200 hover:bg-bento-border disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Entra
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
