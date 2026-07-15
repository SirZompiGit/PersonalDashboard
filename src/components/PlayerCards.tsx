import React, { useState } from 'react';
import { Player, InventoryItem, BonusItem } from '../types';
import { Plus, Trash2, Edit2, Check, X, ShieldAlert, Sparkles, Backpack } from 'lucide-react';
import { CampaignTheme, getThemeColors } from '../theme';

interface PlayerCardsProps {
  players: Player[];
  onUpdatePlayer: (id: string, updated: Partial<Player>) => void;
  activePlayerId?: string | null;
  theme?: CampaignTheme;
}

export const PlayerCards: React.FC<PlayerCardsProps> = ({ players, onUpdatePlayer, activePlayerId, theme = 'crimson' }) => {
  // Local state to keep track of inline adding states
  // We can key them by `playerId-section` e.g., "player1-inventory": true
  const [addingState, setAddingState] = useState<{ [key: string]: boolean }>({});
  const [newItemText, setNewItemText] = useState<{ [key: string]: string }>({});

  // Local state for editing individual items
  // Key: "player1-inventory-item1"
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState<string>('');

  const colors = getThemeColors(theme as CampaignTheme);
  const colorName = theme === 'sapphire' ? 'blue' : theme === 'crimson' ? 'red' : theme;

  const toggleAdding = (playerId: string, section: 'inventory' | 'bonus') => {
    const key = `${playerId}-${section}`;
    setAddingState((prev) => ({ ...prev, [key]: !prev[key] }));
    setNewItemText((prev) => ({ ...prev, [key]: '' }));
  };

  const handleAddItem = (playerId: string, section: 'inventory' | 'bonus') => {
    const key = `${playerId}-${section}`;
    const text = newItemText[key]?.trim();
    if (!text) return;

    const player = players.find((p) => p.id === playerId);
    if (!player) return;

    const newId = crypto.randomUUID();

    if (section === 'inventory') {
      const updatedInventory = [...player.inventory, { id: newId, name: text }];
      onUpdatePlayer(playerId, { inventory: updatedInventory });
    } else {
      const updatedBonus = [...player.bonus, { id: newId, name: text }];
      onUpdatePlayer(playerId, { bonus: updatedBonus });
    }

    // Reset adding state
    setNewItemText((prev) => ({ ...prev, [key]: '' }));
    setAddingState((prev) => ({ ...prev, [key]: false }));
  };

  const handleRemoveItem = (playerId: string, section: 'inventory' | 'bonus', itemId: string) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;

    if (section === 'inventory') {
      const updatedInventory = player.inventory.filter((item) => item.id !== itemId);
      onUpdatePlayer(playerId, { inventory: updatedInventory });
    } else {
      const updatedBonus = player.bonus.filter((item) => item.id !== itemId);
      onUpdatePlayer(playerId, { bonus: updatedBonus });
    }
  };

  const startEditingItem = (editKey: string, currentText: string) => {
    setEditingItemId(editKey);
    setEditingItemText(currentText);
  };

  const handleSaveEditItem = (playerId: string, section: 'inventory' | 'bonus', itemId: string) => {
    const text = editingItemText.trim();
    if (!text) return;

    const player = players.find((p) => p.id === playerId);
    if (!player) return;

    if (section === 'inventory') {
      const updatedInventory = player.inventory.map((item) =>
        item.id === itemId ? { ...item, name: text } : item
      );
      onUpdatePlayer(playerId, { inventory: updatedInventory });
    } else {
      const updatedBonus = player.bonus.map((item) =>
        item.id === itemId ? { ...item, name: text } : item
      );
      onUpdatePlayer(playerId, { bonus: updatedBonus });
    }

    setEditingItemId(null);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-base font-semibold uppercase tracking-wider font-display text-slate-200">
          Schede dei Giocatori
        </h2>
        <span className="h-px bg-bento-border flex-grow" />
      </div>

      {players.length === 0 ? (
        <div className="text-center py-10 bg-[#0c0d10] border border-dashed border-bento-border rounded-xl text-slate-500 italic">
          Nessun giocatore disponibile. Aggiungi i partecipanti nell'intestazione in alto per vedere le loro schede dedicate.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {players.map((player) => {
            const inventoryKey = `${player.id}-inventory`;
            const bonusKey = `${player.id}-bonus`;

            return (
              <div
                key={player.id}
                className={`bg-bento-panel border rounded-xl p-5 shadow-lg hover:shadow-xl transition-all relative overflow-hidden flex flex-col ${
                  activePlayerId === player.id
                    ? `border-${colorName}-500 shadow-${colorName}-950/20 ring-1 ring-${colorName}-500/20`
                    : 'border-bento-border hover:border-slate-600'
                }`}
              >
                {/* Visual indicator of luxury slab */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${
                  activePlayerId === player.id ? colors.bg : `bg-${colorName}-500/20`
                }`} />

                {/* Player Name */}
                <div className="border-b border-bento-border pb-3 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-display font-extrabold text-slate-100 tracking-wide">
                      {player.name}
                    </h3>
                    {activePlayerId === player.id && (
                      <span className={`text-[9px] font-mono font-bold tracking-widest ${colors.text} ${colors.glowBg} px-1.5 py-0.5 rounded-full uppercase flex items-center gap-1 animate-pulse`}>
                        ★ Turno
                      </span>
                    )}
                  </div>
                  <div className="p-1 bg-[#0c0d10] border border-bento-border rounded-full text-slate-500">
                    <Backpack className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Grid of Sections: Inventory & Bonuses */}
                <div className="space-y-5 flex-grow">
                  
                  {/* INVENTORY SECTION */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400">
                        Inventario ({player.inventory.length})
                      </span>
                      <button
                        onClick={() => toggleAdding(player.id, 'inventory')}
                        className={`p-1 text-slate-500 hover:${colors.text} hover:bg-[#21242c] rounded transition-colors cursor-pointer`}
                        title="Aggiungi Oggetto"
                      >
                        {addingState[inventoryKey] ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Inline Form to Add Item */}
                    {addingState[inventoryKey] && (
                      <div className="flex gap-1.5 animate-fadeIn">
                        <input
                          type="text"
                          placeholder="Nuovo oggetto..."
                          value={newItemText[inventoryKey] || ''}
                          onChange={(e) =>
                            setNewItemText((prev) => ({ ...prev, [inventoryKey]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddItem(player.id, 'inventory');
                          }}
                          className={`bg-[#0c0d10] border border-bento-border focus:border-${colorName}-500/50 text-slate-100 text-xs rounded px-2.5 py-1 focus:outline-none flex-grow`}
                          autoFocus
                          maxLength={35}
                        />
                        <button
                          onClick={() => handleAddItem(player.id, 'inventory')}
                          className={`px-2 py-1 ${colors.bg} text-white border ${colors.border} rounded text-xs font-semibold hover:${colors.hoverBg} cursor-pointer shadow ${colors.shadow}`}
                        >
                          Salva
                        </button>
                      </div>
                    )}

                    {/* Item List */}
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {player.inventory.length === 0 ? (
                        <p className="text-[11px] text-slate-600 italic">Inventario vuoto.</p>
                      ) : (
                        player.inventory.map((item) => {
                          const editKey = `${player.id}-inventory-${item.id}`;
                          const isEditing = editingItemId === editKey;

                          return (
                            <div
                              key={item.id}
                              className="group flex items-center justify-between bg-[#0c0d10] border border-bento-border rounded px-2.5 py-1.5 text-xs hover:border-slate-600 transition-colors"
                            >
                              {isEditing ? (
                                <div className="flex items-center gap-1 w-full">
                                  <input
                                    type="text"
                                    value={editingItemText}
                                    onChange={(e) => setEditingItemText(e.target.value)}
                                    className={`bg-bento-panel border border-${colorName}-500/50 rounded px-1.5 py-0.5 text-slate-100 focus:outline-none text-xs w-full font-mono`}
                                    autoFocus
                                    maxLength={35}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEditItem(player.id, 'inventory', item.id);
                                      if (e.key === 'Escape') setEditingItemId(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveEditItem(player.id, 'inventory', item.id)}
                                    className="text-emerald-500 hover:text-emerald-400 p-0.5 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-slate-300 truncate pr-2 font-mono">{item.name}</span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => startEditingItem(editKey, item.name)}
                                      className={`p-0.5 text-slate-400 hover:${colors.text} rounded transition-all cursor-pointer`}
                                      title="Modifica"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveItem(player.id, 'inventory', item.id)}
                                      className={`p-0.5 text-slate-400 hover:${colors.text} rounded transition-all cursor-pointer`}
                                      title="Elimina"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* BONUS SECTION */}
                  <div className="space-y-2 border-t border-bento-border pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400">
                        Bonus / Attributi speciali ({player.bonus.length})
                      </span>
                      <button
                        onClick={() => toggleAdding(player.id, 'bonus')}
                        className={`p-1 text-slate-500 hover:${colors.text} hover:bg-[#21242c] rounded transition-colors cursor-pointer`}
                        title="Aggiungi Bonus"
                      >
                        {addingState[bonusKey] ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Inline Form to Add Bonus */}
                    {addingState[bonusKey] && (
                      <div className="flex gap-1.5 animate-fadeIn">
                        <input
                          type="text"
                          placeholder="Nuovo bonus (es. +2 Iniziativa)..."
                          value={newItemText[bonusKey] || ''}
                          onChange={(e) =>
                            setNewItemText((prev) => ({ ...prev, [bonusKey]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddItem(player.id, 'bonus');
                          }}
                          className={`bg-[#0c0d10] border border-bento-border focus:border-${colorName}-500/50 text-slate-100 text-xs rounded px-2.5 py-1 focus:outline-none flex-grow`}
                          autoFocus
                          maxLength={35}
                        />
                        <button
                          onClick={() => handleAddItem(player.id, 'bonus')}
                          className={`px-2 py-1 ${colors.bg} text-white border ${colors.border} rounded text-xs font-semibold hover:${colors.hoverBg} cursor-pointer shadow ${colors.shadow}`}
                        >
                          Salva
                        </button>
                      </div>
                    )}

                    {/* Bonus List */}
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {player.bonus.length === 0 ? (
                        <p className="text-[11px] text-slate-600 italic">Nessun bonus registrato.</p>
                      ) : (
                        player.bonus.map((item) => {
                          const editKey = `${player.id}-bonus-${item.id}`;
                          const isEditing = editingItemId === editKey;

                          return (
                            <div
                              key={item.id}
                              className="group flex items-center justify-between bg-[#0c0d10] border border-bento-border rounded px-2.5 py-1.5 text-xs hover:border-slate-600 transition-colors"
                            >
                              {isEditing ? (
                                <div className="flex items-center gap-1 w-full">
                                  <input
                                    type="text"
                                    value={editingItemText}
                                    onChange={(e) => setEditingItemText(e.target.value)}
                                    className={`bg-bento-panel border border-${colorName}-500/50 rounded px-1.5 py-0.5 text-slate-100 focus:outline-none text-xs w-full font-mono`}
                                    autoFocus
                                    maxLength={35}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEditItem(player.id, 'bonus', item.id);
                                      if (e.key === 'Escape') setEditingItemId(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveEditItem(player.id, 'bonus', item.id)}
                                    className="text-emerald-500 hover:text-emerald-400 p-0.5 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className={`text-slate-300 truncate pr-2 font-mono ${colors.textActive}`}>{item.name}</span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => startEditingItem(editKey, item.name)}
                                      className={`p-0.5 text-slate-400 hover:${colors.text} rounded transition-all cursor-pointer`}
                                      title="Modifica"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveItem(player.id, 'bonus', item.id)}
                                      className={`p-0.5 text-slate-400 hover:${colors.text} rounded transition-all cursor-pointer`}
                                      title="Elimina"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
