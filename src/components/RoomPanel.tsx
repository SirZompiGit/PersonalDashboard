/**
 * Pannello della stanza multiplayer, lato master.
 * Estratto da App.tsx. Il PIN si copia con un click invece di doverlo
 * trascrivere a mano.
 */

import { useState } from 'react';
import type { Player, RollResult } from '../types';
import { type RoomUser, updateUser } from '../firebaseUtils';
import { Check, Copy, Link as LinkIcon, Users, Wifi, WifiOff } from 'lucide-react';
import { ConfirmInline } from './ui/ConfirmInline';
import { d2FaceText } from '../lib/dice';
import { decodeRollLabel, resolveRollerName } from '../lib/participantRolls';

/** Lanci dei giocatori mostrati: una striscia, senza andare a capo. */
const MAX_VISIBLE_ROLLS = 4;

interface RoomPanelProps {
  pin: string;
  users: Record<string, RoomUser>;
  participantRolls: RollResult[];
  players: Player[];
  online: boolean;
  onCloseRoom: () => void;
  /** Etichette delle facce del d2 (es. "Testa" / "Croce"). */
  d2Labels: string[];
}

export function RoomPanel({
  pin,
  users,
  participantRolls,
  players,
  online,
  onCloseRoom,
  d2Labels,
}: RoomPanelProps) {
  const [copied, setCopied] = useState<'pin' | 'link' | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);

  const userList = Object.values(users ?? {});

  /** Link che apre Fantasia con il PIN già compilato. */
  const inviteLink = `${window.location.origin}${window.location.pathname}?room=${pin}`;

  const copy = async (what: 'pin' | 'link') => {
    try {
      await navigator.clipboard.writeText(what === 'pin' ? pin : inviteLink);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.warn('[fantasia] copia non riuscita:', error);
    }
  };

  return (
    <div className="relative z-10 mx-auto mb-6 flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-theme-500/30 bg-theme-500/5 p-3 shadow-panel sm:p-4">
        {/* Striscia compatta: il PIN e le sue azioni stanno su una riga sola,
            invece di occupare una colonna alta quanto tutto il pannello. */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2.5 rounded-lg border border-theme-500/40 bg-bento-void px-3 py-1.5">
            {online ? (
              <Wifi className="h-3.5 w-3.5 text-theme-400" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-theme-400">
              PIN
            </span>
            <span className="numeric-display font-display text-xl font-black tracking-widest text-white sm:text-2xl">
              {pin}
            </span>
          </div>

          <button
            type="button"
            onClick={() => copy('pin')}
            className="flex items-center gap-1.5 rounded-lg border border-bento-border bg-bento-button px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-200 transition-colors duration-200 hover:bg-bento-border"
          >
            {copied === 'pin' ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" /> Copiato
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> PIN
              </>
            )}
          </button>

          {/* Il PIN resta il modo principale: il link è un'aggiunta, per chi
              preferisce mandare qualcosa su cui cliccare. */}
          <button
            type="button"
            onClick={() => copy('link')}
            className="flex items-center gap-1.5 rounded-lg border border-theme-500/40 bg-theme-600/15 px-3 py-2 text-xs font-bold uppercase tracking-wider text-theme-400 transition-colors duration-200 hover:bg-theme-600/30"
          >
            {copied === 'link' ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" /> Copiato
              </>
            ) : (
              <>
                <LinkIcon className="h-3.5 w-3.5" /> Invito
              </>
            )}
          </button>

          {!online && (
            <span className="text-[10px] leading-snug text-amber-400">
              Rete assente: le modifiche partiranno al ritorno della connessione.
            </span>
          )}


          <div className="ml-auto">
            {confirmingClose ? (
              <ConfirmInline
                question="Chiudere la stanza?"
                confirmLabel="Chiudi"
                cancelLabel="Annulla"
                onConfirm={() => {
                  setConfirmingClose(false);
                  onCloseRoom();
                }}
                onCancel={() => setConfirmingClose(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClose(true)}
                className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-400 transition-colors duration-200 hover:bg-red-500/20"
              >
                Chiudi Stanza
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-bento-border bg-bento-bg p-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Giocatori Connessi ({userList.length})
          </span>

          {userList.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-3 text-center">
              <Users className="h-5 w-5 text-slate-700" />
              <span className="text-xs italic text-slate-600">
                Comunica il PIN ai giocatori per farli entrare.
              </span>
            </div>
          ) : (
            <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin sm:grid-cols-2 xl:grid-cols-3">
              {userList.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 p-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-bold text-slate-200">
                      {user.name}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] text-slate-500">
                      {user.id.slice(5, 10)}
                    </span>
                  </div>

                  <select
                    value={user.assignedPlayerId ?? ''}
                    onChange={(event) =>
                      updateUser(pin, user.id, {
                        assignedPlayerId: event.target.value || null,
                      }).catch(console.error)
                    }
                    aria-label={`Personaggio assegnato a ${user.name}`}
                    className="w-full cursor-pointer rounded border border-slate-700 bg-bento-void px-1.5 py-1 text-[10px] text-slate-300 focus:border-theme-500 focus:outline-none"
                  >
                    <option value="">- Spettatore -</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {participantRolls.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-bento-border bg-bento-panel p-4">
          <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Lanci dei Giocatori
          </span>

          {/* Una striscia sola con gli ultimi quattro lanci. */}
          <div className="flex gap-3">
            {participantRolls.slice(0, MAX_VISIBLE_ROLLS).map((roll, index) => {
              const decoded = decodeRollLabel(roll.label);
              const name = resolveRollerName(decoded, (userId) => {
                const user = users?.[userId];
                if (!user) return null;
                const assigned = players.find((p) => p.id === user.assignedPlayerId);
                return assigned ? assigned.name : user.name;
              });

              return (
                <div
                  key={`${roll.timestamp}-${index}`}
                  className={`flex min-w-0 flex-1 flex-col rounded-lg border bg-bento-bg p-3 transition-colors duration-200 hover:border-slate-600 ${
                    index === 0 ? 'border-theme-500/40' : 'border-slate-700/50'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                    <span
                      className="min-w-0 truncate font-mono text-[11px] font-bold text-slate-300"
                      title={name}
                    >
                      {name}
                    </span>
                    <span className="shrink-0 rounded bg-bento-void px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                      {roll.diceType}
                    </span>
                  </div>

                  <span
                    className={`numeric-display max-w-full truncate px-1 py-2 text-center font-display font-black text-white ${
                      d2FaceText(roll.diceType, roll.result, d2Labels) ? 'text-xl' : 'text-4xl'
                    }`}
                    title={d2FaceText(roll.diceType, roll.result, d2Labels) ?? undefined}
                  >
                    {d2FaceText(roll.diceType, roll.result, d2Labels) ?? roll.result}
                  </span>

                  {decoded.label && (
                    <span
                      className="mx-auto max-w-full truncate rounded-full border border-slate-800 bg-bento-void px-2 py-0.5 font-mono text-[10px] text-slate-400"
                      title={decoded.label}
                    >
                      {decoded.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
