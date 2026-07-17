import sys
import re

with open('src/components/SharedView.tsx', 'r') as f:
    code = f.read()

# Left is already 3.
# Let's change Middle back to 5.
code = code.replace('<div className="col-span-4 bg-bento-panel border border-bento-border rounded-xl p-5 md:p-6 shadow-lg h-full flex flex-col overflow-hidden">',
                    '<div className="col-span-5 bg-bento-panel border border-bento-border rounded-xl p-5 md:p-6 shadow-lg h-full flex flex-col overflow-hidden">')

# Let's change Right to 4.
code = code.replace('<div className="col-span-5 flex h-full min-h-0 gap-4">',
                    '<div className="col-span-4 flex h-full min-h-0 gap-4">')

with open('src/components/SharedView.tsx', 'w') as f:
    f.write(code)

