import sys
import re

with open('src/components/ParticipantView.tsx', 'r') as f:
    code = f.read()

target = "theme={roomState.campaign.theme}\n              />"
new_target = "theme={roomState.campaign.theme}\n                diceLabels={roomState.campaign.diceLabels || ['Tiro salvezza', 'Tiro attacco', 'Prova di abilità', 'Percezione', 'Danno']}\n              />"

code = code.replace(target, new_target)

with open('src/components/ParticipantView.tsx', 'w') as f:
    f.write(code)

