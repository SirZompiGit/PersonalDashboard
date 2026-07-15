import React, { useState, useEffect } from 'react';
import { BookOpen, AlertCircle, Copy, Check } from 'lucide-react';

interface MasterNotesProps {
  notes: string;
  onNotesChange: (text: string) => void;
}

export const MasterNotes: React.FC<MasterNotesProps> = ({ notes, onNotesChange }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(notes);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <div className="bg-bento-panel border border-bento-border rounded-xl p-6 shadow-xl flex flex-col h-full relative overflow-hidden">
      {/* Visual top border */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500/0 via-red-500/30 to-red-500/0" />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider font-display text-slate-200 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-red-500" />
          Appunti del Master
        </h2>

        {notes.trim().length > 0 && (
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-[#21242c] rounded text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5 text-xs cursor-pointer"
            title="Copia appunti negli appunti di sistema"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-medium">Copiato!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copia</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="flex-grow relative">
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Scrivi qui i tuoi appunti della sessione (es. trame, PNG incontrati, indizi trovati, segreti da revelar...)"
          className="w-full h-full min-h-[180px] bg-[#0c0d10] border border-bento-border focus:border-red-500/40 text-slate-200 placeholder-slate-600 text-sm rounded-lg p-4 focus:outline-none focus:ring-1 focus:ring-red-500/20 leading-relaxed resize-none font-sans"
        />
        
        {/* Save indicator dot */}
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Salvataggio automatico attivo
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 text-[11px] text-slate-500">
        <AlertCircle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
        <p className="leading-tight">
          Questi appunti sono visibili solo a te sul tuo pannello di controllo del Master e vengono nascosti automaticamente nella modalità Schermo Condiviso.
        </p>
      </div>
    </div>
  );
};
