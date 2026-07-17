import sys
import re

with open('src/components/SharedView.tsx', 'r') as f:
    code = f.read()

# Add imports
if 'Maximize2' not in code:
    code = code.replace("import { Shield, Sparkles, BookOpen, Heart, Star, GripHorizontal, GripVertical }", 
                        "import { Shield, Sparkles, BookOpen, Heart, Star, GripHorizontal, GripVertical, Maximize2, X, Dices }")

# Add state
state_var = "const [expandedNote, setExpandedNote] = useState<'campaign' | 'personal' | null>(null);"
if state_var not in code:
    code = code.replace("const dummyRef = useRef<string | null>(null);", 
                        f"const dummyRef = useRef<string | null>(null);\n  {state_var}")


# Replace bottom area
bottom_area_regex = re.compile(r'\{\/\* Bottom Area: Campaign Notes \*\/}.*?(?=<\/div>\s*<\/div>\s*<\/div>\s*\);\s*};)', re.DOTALL)

new_bottom_area = """          {/* Bottom Area: Notes */}
          {((state.campaignNotes && state.campaignNotes.trim().length > 0) || personalNotesSlot) && (
            <div className="flex flex-col md:flex-row gap-4 shrink-0 h-48 min-h-[12rem] max-h-[80vh] relative">
              
              {state.campaignNotes && state.campaignNotes.trim().length > 0 && (
                <div className="bg-bento-panel border border-bento-border rounded-xl p-5 shadow-lg flex flex-col flex-[3] resize-y overflow-hidden relative">
                  <div className="border-b border-bento-border pb-3 mb-3 shrink-0 flex items-center justify-between">
                    <h2 className="text-sm font-display font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-2">
                      <BookOpen className={`w-4 h-4 ${colors.text}`} /> Appunti Campagna
                    </h2>
                    <button onClick={() => setExpandedNote('campaign')} className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 text-[10px] uppercase font-bold cursor-pointer"><Maximize2 className="w-3 h-3"/> Extend</button>
                  </div>
                  <div className="flex-1 w-full bg-[#0c0d10] border border-bento-border text-slate-200 text-sm rounded-lg p-3 leading-relaxed font-sans shadow-inner overflow-y-auto whitespace-pre-wrap break-words scrollbar-hide">
                    {state.campaignNotes}
                  </div>
                </div>
              )}

              {personalNotesSlot && (
                <div className="bg-bento-panel border border-bento-border rounded-xl p-5 shadow-lg flex flex-col flex-[2] resize-y overflow-hidden relative">
                  <div className="border-b border-bento-border pb-3 mb-3 shrink-0 flex items-center justify-between">
                    <h2 className="text-sm font-display font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-2">
                      <BookOpen className={`w-4 h-4 text-emerald-400`} /> Appunti Personali
                    </h2>
                    <button onClick={() => setExpandedNote('personal')} className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 text-[10px] uppercase font-bold cursor-pointer"><Maximize2 className="w-3 h-3"/> Extend</button>
                  </div>
                  <div className="flex-1 overflow-hidden flex flex-col">
                    {personalNotesSlot}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modals for Expanded Notes */}
          {expandedNote === 'campaign' && (
             <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-12 animate-fadeIn">
               <div className="bg-bento-panel border border-bento-border rounded-2xl w-full max-w-5xl h-full max-h-full flex flex-col shadow-2xl relative overflow-hidden">
                 <div className="bg-slate-900 border-b border-bento-border p-4 flex items-center justify-between shrink-0">
                    <h2 className="text-lg font-display font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-2">
                      <BookOpen className={`w-5 h-5 ${colors.text}`} /> Appunti Campagna
                    </h2>
                    <button onClick={() => setExpandedNote(null)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"><X className="w-5 h-5"/></button>
                 </div>
                 <div className="flex-1 bg-[#0c0d10] p-6 text-slate-200 text-base leading-relaxed font-sans overflow-y-auto whitespace-pre-wrap break-words">
                    {state.campaignNotes}
                 </div>
               </div>
             </div>
          )}

          {expandedNote === 'personal' && personalNotesSlot && (
             <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-12 animate-fadeIn">
               <div className="bg-bento-panel border border-bento-border rounded-2xl w-full max-w-5xl h-full max-h-full flex flex-col shadow-2xl relative overflow-hidden">
                 <div className="bg-slate-900 border-b border-bento-border p-4 flex items-center justify-between shrink-0">
                    <h2 className="text-lg font-display font-extrabold text-slate-200 tracking-wider uppercase flex items-center gap-2">
                      <BookOpen className={`w-5 h-5 text-emerald-400`} /> Appunti Personali
                    </h2>
                    <button onClick={() => setExpandedNote(null)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"><X className="w-5 h-5"/></button>
                 </div>
                 <div className="flex-1 bg-[#0c0d10] p-6 overflow-hidden flex flex-col">
                    {personalNotesSlot}
                 </div>
               </div>
             </div>
          )}
"""

code = bottom_area_regex.sub(new_bottom_area, code)

# Inject diceRollerSlot
# We need to find the element containing <span className="text-xs uppercase font-mono tracking-widest text-slate-500">Ultimo Lancio</span>
# and place the diceRollerSlot above it.

ultimo_lancio_search = r'<div className="border-b border-bento-border pb-2 mb-2 w-full">\s*<span className="text-xs uppercase font-mono tracking-widest text-slate-500">Ultimo Lancio</span>'

dice_roller_injection = """
                  {diceRollerSlot && (
                    <div className="mb-4 z-10 relative bg-[#0c0d10]/90 border border-slate-700/50 rounded-xl shadow-inner transform scale-90 origin-top flex flex-col -mt-2">
                      {diceRollerSlot}
                    </div>
                  )}
                  <div className="border-b border-bento-border pb-2 mb-2 w-full">
                    <span className="text-xs uppercase font-mono tracking-widest text-slate-500">Ultimo Lancio</span>
"""

code = re.sub(ultimo_lancio_search, dice_roller_injection, code)


with open('src/components/SharedView.tsx', 'w') as f:
    f.write(code)

