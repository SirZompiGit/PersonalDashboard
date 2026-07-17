import sys
import re

with open('src/components/ParticipantView.tsx', 'r') as f:
    code = f.read()

# Replace the Personal Action Area and the separator
action_area_regex = re.compile(r'\{\/\* Personal Action Area \*\/\}.*?\{\/\* Shared View \(Master\'s View\) \*\/\}', re.DOTALL)

shared_view_regex = re.compile(r'<SharedView state=\{roomState\.campaign\} theme=\{roomState\.campaign\.theme \|\| \'red\'\} participantRolls=\{roomState\.participantRolls\} \/>')

new_shared_view = """<SharedView 
          state={roomState.campaign} 
          theme={roomState.campaign.theme || 'red'} 
          participantRolls={roomState.participantRolls} 
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
              />
            ) : (
              <div className="bg-[#1a1d23] border border-bento-border rounded-xl p-5 flex flex-col items-center justify-center text-center opacity-50 h-32">
                 <span className="text-xs text-slate-500 uppercase tracking-widest font-mono">Dadi non disponibili</span>
              </div>
            )
          }
        />"""

# Remove the action area
code = action_area_regex.sub("{/* Shared View (Master's View) */}", code)

# Replace the SharedView call
code = code.replace("<SharedView state={roomState.campaign} theme={roomState.campaign.theme || 'red'} participantRolls={roomState.participantRolls} />", new_shared_view)

with open('src/components/ParticipantView.tsx', 'w') as f:
    f.write(code)

