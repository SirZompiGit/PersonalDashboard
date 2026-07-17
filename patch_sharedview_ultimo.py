import sys
import re

with open('src/components/SharedView.tsx', 'r') as f:
    code = f.read()

code = code.replace('<span className="text-xs uppercase font-mono tracking-widest text-slate-500">Ultimo Lancio</span>', '<span className="text-xs uppercase font-mono tracking-widest text-slate-500">DADO MASTER</span>')

with open('src/components/SharedView.tsx', 'w') as f:
    f.write(code)

