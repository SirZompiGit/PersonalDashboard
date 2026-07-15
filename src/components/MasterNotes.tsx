import React, { useState, useEffect } from 'react';
import { BookOpen, AlertCircle, Copy, Check, Maximize2, Minimize2 } from 'lucide-react';

interface MasterNotesProps {
  notes: string;
  onNotesChange: (text: string) => void;
}

export const MasterNotes: React.FC<MasterNotesProps> = ({ notes, onNotesChange }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(notes);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const content = (
    <>
      {/* Visual top border */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500/0 via-red-500/30 to-red-500/0" />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider font-display text-slate-200 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-red-500" />
          Appunti del Master
        </h2>

        <div className="flex items-center gap-1">
          {notes.trim().length > 0 && (
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-[#21242c] rounded text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5 text-xs cursor-pointer"
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
                  <span className="hidden sm:inline">Copia</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title={isExpanded ? "Riduci" : "Espandi a tutto schermo"}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span>Riduci</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span>Espandi</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-grow relative flex flex-col min-h-0">
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Scrivi qui i tuoi appunti della sessione (es. trame, PNG incontrati, indizi trovati, segreti da revelar...)"
          className="w-full h-full min-h-[180px] flex-grow bg-[#0c0d10] border border-bento-border focus:border-red-500/40 text-slate-200 placeholder-slate-600 text-sm rounded-lg p-4 focus:outline-none focus:ring-1 focus:ring-red-500/20 leading-relaxed resize-y font-sans"
        />
        
        {/* Save indicator dot */}
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5 text-[10px] text-slate-500 font-mono pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Salvataggio automatico
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 text-[11px] text-slate-500 shrink-0">
        <AlertCircle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
        <p className="leading-tight">
          Questi appunti sono visibili solo a te sul tuo pannello di controllo del Master e vengono nascosti automaticamente nella modalità Schermo Condiviso.
        </p>
      </div>
    </>
  );

  if (isExpanded) {
    return (
      <>
        {/* Normal collapsed view left in the flow but invisible or placeholder, to maintain layout height if needed, but flex-grow works fine */}
        <div className="bg-bento-panel border border-bento-border rounded-xl p-6 shadow-xl flex flex-col h-full relative overflow-hidden hidden lg:flex opacity-0">
          <div className="min-h-[180px]" />
        </div>

        {/* Fullscreen Overlay */}
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-fadeIn">
          <div className="bg-bento-panel border border-red-500/30 rounded-xl p-6 sm:p-8 shadow-2xl flex flex-col w-full max-w-5xl h-full max-h-[90vh] relative overflow-hidden">
            {content}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="bg-bento-panel border border-bento-border rounded-xl p-6 shadow-xl flex flex-col h-full relative overflow-hidden transition-all duration-300">
      {content}
    </div>
  );
};

