import sys

with open('src/components/SharedView.tsx', 'r') as f:
    code = f.read()

# Revert wrapper
code = code.replace('w-full h-full min-h-full bg-[#0c0d10] text-slate-100 overflow-auto relative font-sans flex flex-col items-center justify-center p-4 md:p-8',
                    'w-full h-full min-h-full bg-[#0c0d10] text-slate-100 overflow-auto relative font-sans flex flex-col p-4 md:p-8')

# Revert container
code = code.replace('className="w-full max-w-[98%] xl:max-w-[1800px] min-w-[1200px] flex-1 bg-bento-panel border border-bento-border/50 rounded-2xl shadow-2xl flex flex-col p-6 xl:p-8 relative z-10 mx-auto my-2 min-h-0 overflow-hidden"',
                    'className="w-full max-w-[95%] xl:max-w-[1600px] min-w-[1024px] min-h-[500px] h-fit bg-bento-panel border border-bento-border/50 rounded-2xl shadow-2xl flex flex-col p-8 relative z-10 m-auto shrink-0"')

# Revert spans
code = code.replace('<div className="col-span-5 bg-bento-panel border border-bento-border rounded-xl p-5 md:p-6 shadow-lg h-full flex flex-col overflow-hidden">',
                    '<div className="col-span-5 bg-bento-panel border border-bento-border rounded-xl p-5 md:p-6 shadow-lg h-full flex flex-col overflow-hidden min-h-0">') # wait, did I change min-h-0? Let's just fix it later.

with open('src/components/SharedView.tsx', 'w') as f:
    f.write(code)

