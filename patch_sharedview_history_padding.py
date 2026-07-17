import sys

with open('src/components/SharedView.tsx', 'r') as f:
    code = f.read()

target = 'className="bg-bento-panel border border-bento-border rounded-xl p-3 md:p-4 flex flex-col items-center justify-center text-center relative overflow-hidden flex-1 shadow-lg min-h-0"'
replacement = 'className="bg-bento-panel border border-bento-border rounded-xl p-3 md:p-4 pb-12 md:pb-14 flex flex-col items-center justify-center text-center relative overflow-hidden flex-1 shadow-lg min-h-0"'

code = code.replace(target, replacement)

with open('src/components/SharedView.tsx', 'w') as f:
    f.write(code)

