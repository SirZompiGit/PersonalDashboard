const fs = require('fs');
let code = fs.readFileSync('src/components/HealthBarItem.tsx', 'utf8');

code = code.replace(
  'readOnly?: boolean;',
  "readOnly?: boolean;\n  layout?: 'horizontal' | 'vertical';"
);

code = code.replace(
  'readOnly = false',
  "readOnly = false,\n  layout = 'horizontal'"
);

code = code.replace(
  'className={`bg-[#0c0d10] border border-bento-border rounded-xl p-4 ${readOnly ? \'\' : \'hover:border-slate-600\'} transition-all relative group`}',
  'className={`bg-[#0c0d10] border border-bento-border rounded-xl p-4 ${readOnly ? \'\' : \'hover:border-slate-600\'} transition-all relative group ${layout === \'vertical\' ? \'flex flex-col-reverse items-center justify-between h-[300px] w-[90px] shrink-0\' : \'\'}`}'
);

code = code.replace(
  '<div className={`flex justify-between items-center mb-2.5 relative z-10 transition-all duration-200 ${readOnly ? \'pr-2\' : \'pr-2 group-hover:pr-[220px] group-focus-within:pr-[220px]\'}`}>',
  '<div className={`flex justify-between items-center relative z-10 transition-all duration-200 ${layout === \'vertical\' ? \'flex-col gap-2 mb-0 mt-2\' : `mb-2.5 ${readOnly ? \'pr-2\' : \'pr-2 group-hover:pr-[220px] group-focus-within:pr-[220px]\'}`}`}>'
);

code = code.replace(
  '<div className="flex items-center gap-2 min-w-0">',
  '<div className={`flex items-center gap-2 min-w-0 ${layout === \'vertical\' ? \'flex-col\' : \'\'}`}>'
);

code = code.replace(
  '<span className="font-display font-bold text-slate-200 tracking-wide text-sm md:text-base truncate">',
  '<span className={`font-display font-bold text-slate-200 tracking-wide text-sm md:text-base ${layout === \'vertical\' ? \'break-all text-center leading-tight [writing-mode:vertical-rl] rotate-180\' : \'truncate\'}`}>'
);

code = code.replace(
  '<div className="font-mono text-xs text-slate-400 shrink-0">',
  '<div className={`font-mono text-xs text-slate-400 shrink-0 flex items-center ${layout === \'vertical\' ? \'flex-col\' : \'\'}`}>'
);

code = code.replace(
  '<div className="relative">',
  '<div className={`relative ${layout === \'vertical\' ? \'flex-grow w-full flex justify-center\' : \'\'}`}>'
);

code = code.replace(
  'className={`flex h-8 w-full rounded-lg bg-[#1a1d23] overflow-hidden border border-[#2d333d]',
  'className={`flex ${layout === \'vertical\' ? \'flex-col-reverse w-8 h-full\' : \'h-8 w-full\'} rounded-lg bg-[#1a1d23] overflow-hidden border border-[#2d333d]'
);

code = code.replace(
  'className="h-full flex-grow rounded-[2px] transition-all duration-200"',
  'className={`${layout === \'vertical\' ? \'w-full\' : \'h-full\'} flex-grow rounded-[2px] transition-all duration-200`}'
);


fs.writeFileSync('src/components/HealthBarItem.tsx', code);
