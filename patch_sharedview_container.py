import sys
import re

with open('src/components/SharedView.tsx', 'r') as f:
    code = f.read()

# Make it fill more width, and take full height to scroll internally
code = code.replace('className="w-full max-w-[95%] xl:max-w-[1600px] min-w-[1024px] min-h-[500px] h-fit bg-bento-panel border border-bento-border/50 rounded-2xl shadow-2xl flex flex-col p-8 relative z-10 m-auto shrink-0"',
                    'className="w-full max-w-[98%] xl:max-w-[1800px] min-w-[1200px] flex-1 bg-bento-panel border border-bento-border/50 rounded-2xl shadow-2xl flex flex-col p-6 xl:p-8 relative z-10 mx-auto my-2 min-h-0 overflow-hidden"')

with open('src/components/SharedView.tsx', 'w') as f:
    f.write(code)

