import sys

with open('src/components/SharedView.tsx', 'r') as f:
    code = f.read()

code = code.replace("import { CampaignState, Player, HealthBar } from '../types';", "import { CampaignState, Player, HealthBar } from '../types';\nimport { RoomUser } from '../firebaseUtils';")

code = code.replace("  participantRolls?: RollResult[];\n  theme?: CampaignTheme;", "  participantRolls?: RollResult[];\n  roomUsers?: Record<string, RoomUser>;\n  theme?: CampaignTheme;")

code = code.replace("export const SharedView: React.FC<SharedViewProps> = ({ state, participantRolls = [], personalNotesSlot, diceRollerSlot, isLite }) => {", "export const SharedView: React.FC<SharedViewProps> = ({ state, participantRolls = [], roomUsers, personalNotesSlot, diceRollerSlot, isLite }) => {")

# Also replace the participant roll logic
target_logic = """                      let playerLabel = roll.label || 'Sconosciuto';
                      let rollLabel = '';
                      if (playerLabel.includes('|')) {
                         const parts = playerLabel.split('|');
                         if (parts.length >= 2) {
                            playerLabel = parts[1] || parts[0];
                            rollLabel = parts.slice(2).join('|');
                         } else {
                            playerLabel = parts[0];
                         }
                      }"""

new_logic = """                      let playerLabel = 'Sconosciuto';
                      let rollLabel = '';
                      const labelParts = roll.label ? roll.label.split('|') : [];
                      
                      if (labelParts.length >= 2) {
                         const rollerId = labelParts[0];
                         const rollUserName = labelParts[1];
                         rollLabel = labelParts.slice(2).join('|');
                         const roller = roomUsers ? Object.values(roomUsers).find(u => u.id === rollerId) : undefined;
                         
                         if (roller) {
                            const assignedPlayer = state.players.find(p => p.id === roller.assignedPlayerId);
                            playerLabel = assignedPlayer ? assignedPlayer.name : roller.name;
                         } else {
                            playerLabel = rollUserName;
                         }
                      } else if (labelParts.length === 1) {
                         rollLabel = labelParts[0];
                      }"""

code = code.replace(target_logic, new_logic)

with open('src/components/SharedView.tsx', 'w') as f:
    f.write(code)

