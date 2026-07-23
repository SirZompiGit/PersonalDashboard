/**
 * Scelta della modalità all'avvio.
 *
 * Tre ingressi distinti invece di due modalità dai nomi opachi:
 *  - **Locale**  — la dashboard completa, tutto su questo dispositivo.
 *  - **Crea una stanza** — sessione online in tempo reale, tu ospiti.
 *  - **Entra con un PIN** — ci si unisce come giocatore (evidenziato da invito).
 *
 * "Lite" e "X" non dicevano nulla a chi apriva l'app; "Crea" ed "Entra" erano
 * per giunta due azioni opposte infilate nella stessa scheda.
 *
 * Note conservate: la parte online si disattiva con una spiegazione quando
 * Firebase non è configurato, e il giocatore sceglie il nome subito.
 */

import { type FormEvent, useState } from 'react';
import { AlertTriangle, ArrowRight, Crown, LogIn, Monitor, Shield } from 'lucide-react';
import { Wordmark } from './ui/Wordmark';
import type { CampaignStyle, LogoVariant } from '../theme';

interface WelcomeScreenProps {
  /** Design in vigore: sceglie la variante del marchio adatta al fondo. */
  style: CampaignStyle;
  logoVariant: LogoVariant;
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

/** Base comune dei tre riquadri. Il colore del bordo lo mette ogni scheda. */
const TILE =
  'group relative flex flex-col overflow-hidden rounded-3xl border bg-bento-panel p-6 text-left shadow-overlay transition-colors duration-200 sm:p-7';

const KICKER = 'mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em]';
const TITLE =
  'mb-2.5 font-display text-xl font-black uppercase tracking-wide text-slate-100 sm:text-2xl';
const BODY = 'text-sm leading-relaxed text-slate-400';
const ICON_BOX = 'mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border';
const CTA =
  'flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold uppercase tracking-wider transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50';

export function WelcomeScreen({
  style,
  logoVariant,
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

  /** Spiegazione mostrata quando il multiplayer non è configurato. */
  const configNote = (
    <div className="mt-auto rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs leading-relaxed text-amber-300">
      Multiplayer non configurato. Copia{' '}
      <code className="rounded bg-bento-void px-1 py-0.5 font-mono">.env.example</code> in{' '}
      <code className="rounded bg-bento-void px-1 py-0.5 font-mono">.env</code>, inserisci le
      credenziali Firebase e riavvia il server.
    </div>
  );

  return (
    <div className="app-surface relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-bento-bg p-4 font-sans text-slate-100 sm:p-8">
      {/* Aura superiore, nel colore del tema. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-radial from-theme-600/10 to-transparent" />

      <header className="relative flex flex-col items-center text-center">
        <Wordmark
          style={style}
          variant={logoVariant}
          className="h-14 max-w-[min(80vw,26rem)] object-contain sm:h-20"
          fallbackClassName="font-display text-3xl font-black uppercase tracking-[0.2em] text-slate-100 sm:text-4xl"
        />
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.32em] text-slate-500">
          Plancia di comando per sessioni di gioco di ruolo
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="relative flex w-full max-w-5xl items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/30 p-4 animate-fade-in"
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

      <div className="relative grid w-full max-w-5xl grid-cols-1 gap-4 lg:grid-cols-3">
        {/* -------------------------------------------------------- Locale */}
        <section className={`${TILE} border-bento-border hover:border-sky-400/40`}>
          <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-sky-500/10 opacity-0 blur-3xl transition-opacity duration-200 group-hover:opacity-100" />

          <div className={`${ICON_BOX} border-sky-400/20 bg-sky-400/10 text-sky-300`}>
            <Monitor className="h-7 w-7" />
          </div>
          <p className={`${KICKER} text-sky-300/90`}>Su questo dispositivo</p>
          <h2 className={TITLE}>Locale</h2>
          <p className={BODY}>
            La dashboard completa, senza stanze né PIN: i dati restano nel browser di questo
            dispositivo. Perfetta al tavolo, con lo schermo condiviso su un secondo monitor.
          </p>

          <button
            type="button"
            onClick={onSelectLite}
            className={`${CTA} mt-6 border-sky-400/20 bg-sky-400/10 text-sky-300 hover:bg-sky-400 hover:text-slate-900`}
          >
            Avvia <ArrowRight className="h-4 w-4" />
          </button>
        </section>

        {/* -------------------------------------------------- Crea stanza */}
        <section className={`${TILE} border-bento-border hover:border-theme-500/40`}>
          <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-theme-500/10 opacity-0 blur-3xl transition-opacity duration-200 group-hover:opacity-100" />

          <div className={`${ICON_BOX} border-theme-500/20 bg-theme-500/10 text-theme-400`}>
            <Crown className="h-7 w-7" />
          </div>
          <p className={`${KICKER} text-theme-400/90`}>Online · tu ospiti</p>
          <h2 className={TITLE}>Crea una stanza</h2>
          <p className={BODY}>
            Apri una sessione condivisa in tempo reale. Ottieni un PIN a 6 cifre e i giocatori
            entrano dai loro dispositivi.
          </p>

          {multiplayerAvailable ? (
            <button
              type="button"
              onClick={onCreateRoom}
              disabled={disabled}
              className={`${CTA} mt-6 border-theme-500 bg-theme-600 text-white shadow-raised hover:bg-theme-500`}
            >
              {isConnecting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              {isConnecting ? 'Connessione...' : 'Crea come master'}
            </button>
          ) : (
            configNote
          )}
        </section>

        {/* -------------------------------------------------------- Entra */}
        <section
          className={`${TILE} ${
            invited
              ? 'border-amber-400/50 ring-1 ring-amber-400/20'
              : 'border-bento-border hover:border-amber-400/40'
          }`}
        >
          <div
            className={`pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl transition-opacity duration-200 ${
              invited ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          />

          <div className={`${ICON_BOX} border-amber-400/20 bg-amber-400/10 text-amber-300`}>
            <LogIn className="h-7 w-7" />
          </div>
          <p className={`${KICKER} text-amber-300/90`}>Online · sei un giocatore</p>
          <h2 className={TITLE}>Entra con un PIN</h2>

          {!multiplayerAvailable ? (
            configNote
          ) : (
            <div className="mt-auto space-y-2.5 pt-2">
              {invited && (
                <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-snug text-amber-300 animate-fade-in">
                  Sei stato invitato alla stanza <strong className="text-white">{pin}</strong>.
                  Scrivi il tuo nome ed entra.
                </p>
              )}

              <form onSubmit={submitJoin} className="space-y-2">
                <input
                  type="text"
                  placeholder="Il tuo nome"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={24}
                  aria-label="Il tuo nome"
                  autoFocus={invited}
                  className="w-full rounded-xl border border-bento-border bg-bento-item px-4 py-3 text-slate-200 transition-colors duration-200 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
                />

                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="PIN · 6 cifre"
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    aria-label="PIN della stanza"
                    className="min-w-0 flex-1 rounded-xl border border-bento-border bg-bento-item px-4 py-3 font-mono tracking-widest text-slate-200 transition-colors duration-200 placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-600 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
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
        </section>
      </div>

      <footer className="relative flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center font-mono text-[11px] tracking-wide text-slate-600">
        <span>I dati locali restano sul tuo dispositivo</span>
        <span className="opacity-40">·</span>
        <span>Le stanze si chiudono quando il master esce</span>
      </footer>
    </div>
  );
}
