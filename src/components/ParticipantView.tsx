import React, { useState } from 'react';
import { RoomState } from '../firebaseUtils';
import { BookOpen, User, Dices, Save } from 'lucide-react';
import { updateUser, pushParticipantRoll } from '../firebaseUtils';
import { SharedView } from './SharedView';
import { DiceRoller } from './DiceRoller';

interface ParticipantViewProps {
  roomId: string;
  userId: string;
  roomState: RoomState;
}

export const ParticipantView: React.FC<ParticipantViewProps> = ({ roomId, userId, roomState }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [selectedDice, setSelectedDice] = useState<string>('d20');

  const user = roomState.users[userId];
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0c0d10] text-slate-400 flex flex-col gap-4 items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p>Accesso in corso...</p>
      </div>
    );
  }

  const assignedPlayer = roomState.campaign.players.find(p => p.id === user.assignedPlayerId);

  const handleNameSave = () => {
    if (tempName.trim()) {
      updateUser(roomId, userId, { name: tempName.trim() }).catch(console.error);
    }
    setIsEditingName(false);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateUser(roomId, userId, { notes: e.target.value }).catch(console.error);
  };

  const myRollHistory = (roomState.participantRolls || [])
    .filter(r => r.label && r.label.startsWith(`${userId}|`))
    .map(r => {
      const parts = r.label!.split('|');
      return {
        ...r,
        label: parts.length > 2 ? parts.slice(2).join('|') : undefined
      };
    })
    .reverse();
    
  const myLastRoll = myRollHistory.length > 0 ? myRollHistory[0] : null;

  return (
    <div className="min-h-screen bg-[#0c0d10] text-slate-400 p-4 md:p-8 flex flex-col gap-6 font-sans">
      
      {/* Top Bar: Identity */}
      <div className="bg-bento-panel border border-bento-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
            <span className="font-mono font-bold text-slate-300">{user.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Connesso come</span>
            <span className="text-sm font-bold text-white">{user.name}</span>
          </div>
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
              <button onClick={handleNameSave} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded flex items-center gap-1"><Save className="w-3 h-3"/> Salva</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => { setTempName(user.name); setIsEditingName(true); }}>
              <User className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
              <span className="text-sm font-bold text-slate-400 group-hover:text-blue-400 transition-colors">Modifica Nome</span>
            </div>
          )}
          
          <div className="h-6 w-px bg-slate-700" />
          
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Personaggio Assegnato</span>
            <span className={`text-sm font-bold ${assignedPlayer ? 'text-emerald-400' : 'text-slate-600'}`}>
              {assignedPlayer ? assignedPlayer.name : 'Spettatore'}
            </span>
          </div>
        </div>
      </div>

      {/* Shared View (Master's View) */}
      <div className="flex-1 min-h-[800px] border border-bento-border rounded-2xl overflow-hidden shadow-2xl relative bg-[#0c0d10]">
        <div className="absolute top-0 left-0 bg-blue-500/10 text-blue-400 px-4 py-1 text-[10px] uppercase font-mono font-bold rounded-br-lg z-50 border-r border-b border-blue-500/20 backdrop-blur-sm">
          Vista Condivisa (Master)
        </div>
        <SharedView 
          state={roomState.campaign} 
          theme={roomState.campaign.theme || 'red'} 
          participantRolls={roomState.participantRolls} 
          roomUsers={roomState.users}
          personalNotesSlot={
            assignedPlayer ? (
              <textarea
                value={user.notes || ''}
                onChange={handleNotesChange}
                placeholder="Scrivi qui i tuoi appunti privati... (Verranno salvati automaticamente)"
                className="flex-1 w-full h-full bg-[#1a1d23] border border-[#2d333d] rounded-lg p-3 text-slate-300 text-sm focus:outline-none focus:border-blue-500/50 resize-none scrollbar-thin"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                 <span className="text-xs text-slate-500 uppercase tracking-widest font-mono">Appunti non disponibili</span>
                 <span className="text-[10px] text-slate-600 mt-2">Attendi che il master ti assegni un personaggio</span>
              </div>
            )
          }
          diceRollerSlot={
            assignedPlayer ? (
              <DiceRoller 
                selectedDice={selectedDice}
                onSelectedDiceChange={setSelectedDice}
                lastRoll={myLastRoll}
                rollHistory={myRollHistory}
                hideHistory={true}
                onRoll={(diceType, result, label) => {
                  const finalLabel = label ? `${userId}|${user.name}|${label}` : `${userId}|${user.name}`;
                  pushParticipantRoll(roomId, {
                    diceType,
                    result,
                    timestamp: Date.now(),
                    label: finalLabel
                  });
                }}
                theme={roomState.campaign.theme}
                diceLabels={roomState.campaign.diceLabels || ['Tiro salvezza', 'Tiro attacco', 'Prova di abilità', 'Percezione', 'Danno']}
              />
            ) : (
              <div className="bg-[#1a1d23] border border-bento-border rounded-xl p-5 flex flex-col items-center justify-center text-center opacity-50 h-32">
                 <span className="text-xs text-slate-500 uppercase tracking-widest font-mono">Dadi non disponibili</span>
              </div>
            )
          }
        />
      </div>

    </div>
  );
};
