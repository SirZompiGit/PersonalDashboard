import sys
import re

with open('src/components/SharedView.tsx', 'r') as f:
    code = f.read()

code = code.replace('w-full h-full min-h-full bg-[#0c0d10] text-slate-100 overflow-auto relative font-sans flex flex-col p-4 md:p-8', 'w-full h-full min-h-full bg-[#0c0d10] text-slate-100 overflow-auto relative font-sans flex flex-col items-center justify-center p-4 md:p-8')

with open('src/components/SharedView.tsx', 'w') as f:
    f.write(code)

