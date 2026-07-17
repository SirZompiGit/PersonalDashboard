import sys

with open('src/components/SharedView.tsx', 'r') as f:
    code = f.read()

target = "{/* Roll History Mini-View DELETED FROM HERE AS REQUESTED */}"

replacement = """{/* Roll History Mini-View */}
                  {state.rollHistory && state.rollHistory.length > 1 && !state.isRollHidden && (
                    <div className="absolute top-2 bottom-2 right-2 w-16 bg-[#0c0d10] border border-bento-border/50 rounded-lg flex flex-col items-center py-2 gap-2 overflow-y-auto scrollbar-none z-30 shadow-inner">
                      {state.rollHistory.slice(-6, -1).reverse().map((r, i) => (
                        <div key={i} className="flex flex-col items-center opacity-60">
                           <span className="text-[8px] text-slate-500 font-mono">{r.diceType}</span>
                           <span className={`font-display font-black text-sm ${r.result === parseInt(r.diceType.substring(1)) ? colors.text : 'text-slate-400'}`}>
                              {r.result}
                           </span>
                        </div>
                      ))}
                    </div>
                  )}"""

code = code.replace(target, replacement)

with open('src/components/SharedView.tsx', 'w') as f:
    f.write(code)

