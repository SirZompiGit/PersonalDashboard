import React, { useState, useEffect } from 'react';
import { RoomState, subscribeToRoom, updateUser, pushParticipantRoll } from '../firebaseUtils';
import { Shield, BookOpen, User, Dices } from 'lucide-react';

interface ParticipantViewProps {
  roomId: string;
  userId: string;
}

export const ParticipantView: React.FC<ParticipantViewProps> = ({ roomId, userId }) => {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string>('');

  useEffect(() => {
    const unsub = subscribeToRoom(roomId, (state) => {
      setRoomState(state);
      setLoading(false);
    });
    return () => unsub();
  }, [roomId]);

  if (loading) {
    return <div className="min-h-screen bg-[#0c0d10] text-slate-400 flex items-center justify-center">Connessione alla stanza {roomId}...</div>;
  }

  if (!roomState) {
    return <div className="min-h-screen bg-[#0c0d10] text-red-400 flex items-center justify-center">Stanza {roomId} non trovata o chiusa.</div>;
  }

  const user = roomState.users[userId];
  if (!user) {
    return <div className="min-h-screen bg-[#0c0d10] text-slate-400 flex items-center justify-center">Accesso negato.</div>;
  }

  const assignedPlayer = roomState.campaign.players.find(p => p.id === user.assignedPlayerId);

  const handleNameSave = () => {
    if (tempName.trim()) {
      updateUser(roomId, userId, { name: tempName.trim() });
    }
    setIsEditingName(false);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateUser(roomId, userId, { notes: e.target.value });
  };

  const rollDice = (type: string) => {
    const max = parseInt(type.substring(1));
    const result = Math.floor(Math.random() * max) + 1;
    pushParticipantRoll(roomId, {
      diceType: type,
      result,
      timestamp: Date.now(),
      label: userId + (selectedLabel ? `|${selectedLabel}` : '')
    });
  };

  return (
    <div className="w-screen h-screen bg-[#0c0d10] text-slate-100 overflow-auto relative font-sans flex flex-col p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0 bg-bento-panel border border-bento-border rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Stanza Attiva</span>
          <span className="text-xl font-display font-black tracking-widest text-blue-400">{roomId}</span>
        </div>
        
        <div className="flex items-center gap-4">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={tempName} 
                onChange={e => setTempName(e.target.value)}
                className="bg-[#1a1d23] border border-bento-border rounded px-2 py-1 text-sm text-slate-200"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleNameSave()}
              />
              <button onClick={handleNameSave} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Salva</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => { setTempName(user.name); setIsEditingName(true); }}>
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{user.name}</span>
            </div>
          )}
          
          <div className="h-6 w-px bg-slate-700" />
          
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Personaggio</span>
            <span className={`text-sm font-bold ${assignedPlayer ? 'text-emerald-400' : 'text-slate-600'}`}>
              {assignedPlayer ? assignedPlayer.name : 'Spettatore'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        
        {/* Left Col: Master's Order of turn & Notes */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full min-h-0">
          
          {/* Notes (Only if assigned) */}
          {assignedPlayer ? (
            <div className="bg-bento-panel border border-bento-border rounded-xl p-5 shadow-lg flex flex-col h-1/2 min-h-0 shrink-0">
              <div className="border-b border-bento-border pb-3 mb-3 shrink-0 flex items-center justify-between">
                <h2 className="text-sm font-display font-bold text-slate-200 uppercase flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" /> Appunti Personali
                </h2>
              </div>
              <textarea
                value={user.notes || ''}
                onChange={handleNotesChange}
                placeholder="Scrivi qui i tuoi appunti privati..."
                className="flex-1 w-full bg-[#1a1d23] border border-[#2d333d] rounded-lg p-3 text-slate-300 text-sm focus:outline-none focus:border-blue-500/50 resize-none"
              />
            </div>
          ) : (
             <div className="bg-bento-panel border border-bento-border rounded-xl p-5 shadow-lg flex flex-col items-center justify-center text-center h-1/2 min-h-0 shrink-0 opacity-50">
                <span className="text-xs text-slate-500 uppercase tracking-widest font-mono">Appunti non disponibili</span>
                <span className="text-[10px] text-slate-600 mt-2">Attendi che il master ti assegni un personaggio</span>
             </div>
          )}

          {/* Turn Order */}
          <div className="bg-bento-panel border border-bento-border rounded-xl p-5 shadow-lg flex flex-col flex-1 min-h-0 overflow-hidden">
             <div className="border-b border-bento-border pb-3 mb-3 shrink-0">
               <h2 className="text-sm font-display font-bold text-slate-200 uppercase flex items-center gap-2">
                 <Shield className="w-4 h-4 text-blue-400" /> Ordine di Turno
               </h2>
             </div>
             <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-2">
                {roomState.campaign.players.map((p, i) => {
                  const isActive = p.id === roomState.campaign.activePlayerId;
                  const isMe = p.id === user.assignedPlayerId;
                  return (
                    <div key={p.id} className={`p-3 rounded-xl border flex items-center gap-3 ${isActive ? 'bg-slate-800 border-blue-500' : 'bg-[#0c0d10] border-slate-800'}`}>
                       <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-blue-500 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>{i+1}</span>
                       <span className={`font-display text-sm font-bold ${isMe ? 'text-emerald-400' : 'text-slate-200'}`}>{p.name} {isMe && '(Tu)'}</span>
                    </div>
                  )
                })}
             </div>
          </div>

        </div>

        {/* Center/Right Col: Dice & Shared View content */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 h-full min-h-0">
           
           {/* Interactive Dice Roller (Only if assigned) */}
           {assignedPlayer && (
             <div className="bg-bento-panel border border-bento-border rounded-xl p-5 shadow-lg shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-display font-bold text-slate-200 uppercase flex items-center gap-2">
                    <Dices className="w-4 h-4 text-emerald-400" /> Lancia i Dadi
                  </h2>
                </div>
                <div className="mb-4">
                  <select 
                    value={selectedLabel} 
                    onChange={e => setSelectedLabel(e.target.value)}
                    className="w-full bg-[#1a1d23] border border-[#2d333d] rounded-lg p-2 text-slate-300 text-sm focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="">Nessuna Etichetta</option>
                    {(roomState.campaign.diceLabels || []).map((l, i) => (
                      <option key={i} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['d3', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'].map(d => (
                    <button
                      key={d}
                      onClick={() => rollDice(d)}
                      className="flex-1 min-w-[60px] py-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono font-bold rounded-lg border border-slate-700 transition-colors shadow-sm"
                    >
                      {d}
                    </button>
                  ))}
                </div>
             </div>
           )}

           {/* The Master's Shared Info (Health, current dice roll, etc) */}
           <div className="flex-1 bg-bento-panel border border-bento-border rounded-xl p-5 shadow-lg flex flex-col min-h-0 relative overflow-hidden">
             <div className="absolute inset-0 bg-radial-gradient from-blue-500/5 via-transparent to-transparent opacity-50 pointer-events-none" />
             <div className="relative z-10 flex flex-col h-full">
               <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 mb-4 block">Eventi del Master</span>
               
               <div className="flex-1 flex flex-col items-center justify-center text-center">
                 {roomState.campaign.lastRoll ? (
                   <div>
                     <span className="text-slate-500 uppercase tracking-widest font-mono text-xs block mb-2">Dado Master: {roomState.campaign.lastRoll.diceType}</span>
                     <span className={`text-6xl font-display font-black text-white ${roomState.campaign.isRollHidden ? 'blur-sm opacity-50' : ''}`}>
                       {roomState.campaign.isRollHidden ? '?' : roomState.campaign.lastRoll.result}
                     </span>
                     {roomState.campaign.isRollHidden && <div className="text-amber-500 font-bold mt-4 uppercase tracking-widest text-sm bg-slate-900/80 px-3 py-1 inline-block rounded">Nascosto</div>}
                   </div>
                 ) : (
                   <span className="text-slate-600 italic">In attesa dei lanci del master...</span>
                 )}
               </div>

               {/* Could also display health bars here if we want, but keeping it simple for now */}
             </div>
           </div>

        </div>

      </div>
    </div>
  );
};
