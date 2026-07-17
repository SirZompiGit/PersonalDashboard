import React, { useState } from 'react';
import { Shield, Users, Sword, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onSelectLite: () => void;
  onSelectMaster: () => void;
  onSelectParticipant: (roomId: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectLite,
  onSelectMaster,
  onSelectParticipant,
}) => {
  const [roomIdInput, setRoomIdInput] = useState('');

  return (
    <div className="min-h-screen bg-[#0c0d10] text-slate-100 flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Lite Mode */}
        <div 
          className="bg-bento-panel border border-bento-border rounded-3xl p-8 flex flex-col items-center text-center cursor-pointer hover:border-slate-600 transition-all group shadow-2xl relative overflow-hidden"
          onClick={onSelectLite}
        >
          <div className="absolute inset-0 bg-radial-gradient from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 transition-transform">
            <Sword className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-black tracking-wider text-slate-100 mb-3 uppercase">Versione Lite</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-1">
            La dashboard classica offline. Tutti i dati vengono salvati localmente sul tuo dispositivo. Ideale per sessioni in presenza o se condividi lo schermo.
          </p>
          <div className="w-full py-3 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold uppercase tracking-wider text-sm group-hover:bg-emerald-500 group-hover:text-slate-900 transition-colors flex items-center justify-center gap-2">
            Avvia Lite <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Multiplayer Mode */}
        <div className="bg-bento-panel border border-bento-border rounded-3xl p-8 flex flex-col shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 text-blue-400 mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-black tracking-wider text-slate-100 mb-3 uppercase text-center">Versione X (Multiplayer)</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 text-center">
            Connessione in tempo reale tramite Firebase. Il master gestisce la sessione, i giocatori si uniscono con il PIN, tirano dadi e hanno appunti privati.
          </p>

          <div className="space-y-4 w-full mt-auto">
            <button
              onClick={onSelectMaster}
              className="w-full py-3 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-slate-900 border border-blue-500/20 rounded-xl font-bold uppercase tracking-wider text-sm transition-all flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" /> Crea come Master
            </button>

            <div className="relative flex items-center gap-2">
              <input
                type="text"
                placeholder="ID Stanza (es. 123456)"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                className="flex-1 bg-[#1a1d23] border border-[#2d333d] rounded-xl px-4 py-3 text-slate-200 font-mono focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                maxLength={6}
              />
              <button
                onClick={() => {
                  if (roomIdInput.trim().length > 0) {
                    onSelectParticipant(roomIdInput.trim());
                  }
                }}
                disabled={!roomIdInput.trim()}
                className="px-6 py-3 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 rounded-xl font-bold uppercase tracking-wider text-sm transition-all"
              >
                Entra
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
