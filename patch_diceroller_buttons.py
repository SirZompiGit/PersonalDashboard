import sys
import re

with open('src/components/DiceRoller.tsx', 'r') as f:
    code = f.read()

# Replace the grid with a flex-wrap layout
code = code.replace('<div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">', '<div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-4">')

# Modify the button classes
code = code.replace('className={`py-2 px-1 text-center font-mono font-bold text-sm rounded-lg border transition-all cursor-pointer ${', 'className={`py-2 px-3 sm:px-4 text-center font-mono font-bold text-sm rounded-lg border transition-all cursor-pointer flex-1 min-w-[3rem] ${')

with open('src/components/DiceRoller.tsx', 'w') as f:
    f.write(code)

