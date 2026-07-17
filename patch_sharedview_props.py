import sys

with open('src/components/SharedView.tsx', 'r') as f:
    code = f.read()

old_props = """interface SharedViewProps {
  state: CampaignState;
  participantRolls?: RollResult[];
  theme?: CampaignTheme;
}"""

new_props = """interface SharedViewProps {
  state: CampaignState;
  participantRolls?: RollResult[];
  theme?: CampaignTheme;
  personalNotesSlot?: React.ReactNode;
  diceRollerSlot?: React.ReactNode;
}"""

code = code.replace(old_props, new_props)

old_comp = """export const SharedView: React.FC<SharedViewProps> = ({ state, participantRolls = [] }) => {
  const { title, players, healthBars, lastRoll, theme = 'crimson' } = state;"""

new_comp = """export const SharedView: React.FC<SharedViewProps> = ({ state, participantRolls = [], personalNotesSlot, diceRollerSlot }) => {
  const { title, players, healthBars, lastRoll, theme = 'crimson' } = state;"""

code = code.replace(old_comp, new_comp)

with open('src/components/SharedView.tsx', 'w') as f:
    f.write(code)

