/**
 * Barra superiore della dashboard: identità, strumenti, impostazioni.
 *
 * Estratta da App.tsx, dove occupava ~400 righe di JSX in linea.
 *
 * Interventi principali:
 *  - Sotto `md` gli strumenti collassano in un menu: prima cinque pulsanti a
 *    testo pieno andavano a capo su quattro righe.
 *  - Il pannello impostazioni diventa un foglio dal basso su schermi stretti,
 *    dove il popover `w-72` ancorato a destra usciva dal viewport.
 *  - L'indicatore di salvataggio è reale. Prima il pallino "Salvataggio
 *    automatico" stava in un componente mai importato da nessuna parte.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Check,
  Cloud,
  Download,
  ExternalLink,
  History,
  MoreHorizontal,
  Palette,
  Settings,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';
import { THEMES, type CampaignTheme } from '../theme';
import { ConfirmInline } from './ui/ConfirmInline';
import type { CampaignBackup, SaveStatus } from '../hooks/useCampaignState';

interface DashboardHeaderProps {
  theme: CampaignTheme;
  onThemeChange: (theme: CampaignTheme) => void;
  isMuted: boolean;
  onMutedChange: (muted: boolean) => void;
  onImport: () => void;
  onExport: () => void;
  onOpenSharedWindow: () => void;
  onPreviewShared: () => void;
  onReset: () => void;
  saveStatus: SaveStatus;
  saveError: string | null;
  backups: CampaignBackup[];
  onRestoreBackup: (backup: CampaignBackup) => void;
}

const TOOL_BUTTON =
  'flex items-center gap-1.5 rounded-xl border border-bento-border bg-bento-panel px-3 py-2 text-xs font-semibold text-slate-300 transition-colors duration-200 hover:bg-bento-button';

export function DashboardHeader({
  theme,
  onThemeChange,
  isMuted,
  onMutedChange,
  onImport,
  onExport,
  onOpenSharedWindow,
  onPreviewShared,
  onReset,
  saveStatus,
  saveError,
  backups,
  onRestoreBackup,
}: DashboardHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [showBackups, setShowBackups] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // La conferma non deve restare armata dopo la chiusura del pannello.
  useEffect(() => {
    if (!settingsOpen) {
      setConfirmingReset(false);
      setShowBackups(false);
    }
  }, [settingsOpen]);

  useEffect(() => {
    if (!settingsOpen && !toolsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
        setToolsOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [settingsOpen, toolsOpen]);

  const tools = (
    <>
      <button type="button" onClick={onImport} className={TOOL_BUTTON}>
        <Upload className="h-3.5 w-3.5 text-slate-400" />
        Importa JSON
      </button>

      <button type="button" onClick={onExport} className={TOOL_BUTTON}>
        <Download className="h-3.5 w-3.5 text-slate-400" />
        Esporta JSON
      </button>

      <button type="button" onClick={onOpenSharedWindow} className={TOOL_BUTTON}>
        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
        Schermo Giocatori
      </button>

      <button
        type="button"
        onClick={onPreviewShared}
        className="flex items-center gap-1.5 rounded-xl border border-theme-500 bg-theme-600 px-4 py-2 text-xs font-bold text-white shadow-raised transition-colors duration-200 hover:bg-theme-500 active:scale-[0.98]"
      >
        <Wand2 className="h-3.5 w-3.5" />
        Anteprima Condivisione
      </button>
    </>
  );

  const saveIndicator = (() => {
    if (saveStatus === 'error') {
      return (
        <span
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400"
          title={saveError ?? undefined}
        >
          <AlertTriangle className="h-3 w-3" /> Non salvato
        </span>
      );
    }
    if (saveStatus === 'saving') {
      return (
        <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
          <Cloud className="h-3 w-3 animate-pulse" /> Salvataggio
        </span>
      );
    }
    if (saveStatus === 'saved') {
      return (
        <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-600">
          <Check className="h-3 w-3 text-emerald-500" /> Salvato
        </span>
      );
    }
    return null;
  })();

  return (
    <header className="relative z-30 mx-auto mb-6 flex w-full max-w-7xl flex-col gap-3 border-b border-bento-border pb-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-bento-border bg-bento-panel shadow-panel">
            <Wand2 className="h-5 w-5 stroke-[2] text-theme-500" />
          </span>
          <div className="flex flex-col">
            <h2 className="flex items-center gap-1.5 font-display text-lg font-extrabold uppercase tracking-wider text-slate-100">
              Fantasia
            </h2>
            {saveIndicator}
          </div>
        </div>

        {/* Su schermi stretti gli strumenti stanno dietro a un menu. */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setToolsOpen((v) => !v)}
            aria-label="Strumenti"
            aria-expanded={toolsOpen}
            className="rounded-xl border border-bento-border bg-bento-panel p-2 text-slate-300 transition-colors duration-200 hover:bg-bento-button"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <SettingsButton open={settingsOpen} onToggle={() => setSettingsOpen((v) => !v)} />
        </div>
      </div>

      {toolsOpen && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-bento-border bg-bento-panel/60 p-2 animate-fade-in md:hidden">
          {tools}
        </div>
      )}

      <div ref={containerRef} className="hidden flex-wrap items-center gap-2 md:flex">
        {tools}
        <SettingsButton open={settingsOpen} onToggle={() => setSettingsOpen((v) => !v)} />
      </div>

      {settingsOpen && (
        <>
          {createPortal(
            <div
              className="fixed inset-0 z-40"
              onClick={() => setSettingsOpen(false)}
              aria-hidden
            />,
            document.body,
          )}

          <div
            role="dialog"
            aria-label="Impostazioni"
            className="fixed inset-x-3 bottom-3 z-50 max-h-[80vh] space-y-4 overflow-y-auto rounded-xl border border-bento-border bg-bento-void p-4 text-left shadow-overlay animate-slide-up sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-auto sm:top-full sm:mt-2 sm:w-80 scrollbar-thin"
          >
            <div className="flex items-center justify-between border-b border-bento-border pb-2">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-300">
                Impostazioni
              </span>
              <span className="font-mono text-[10px] text-slate-500">v3.0</span>
            </div>

            <div className="space-y-2">
              <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Palette className="h-3.5 w-3.5 text-theme-500" /> Tema Interfaccia
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {THEMES.map((definition) => {
                  const isActive = theme === definition.id;
                  return (
                    <button
                      key={definition.id}
                      type="button"
                      onClick={() => onThemeChange(definition.id)}
                      aria-pressed={isActive}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs uppercase tracking-tight transition-colors duration-200 ${
                        isActive
                          ? 'border-theme-500/50 bg-bento-item font-bold text-slate-100'
                          : 'border-transparent bg-bento-panel/40 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: definition.swatch }}
                      />
                      <span className="truncate">{definition.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-bento-border pt-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Effetti Sonori
              </span>
              <button
                type="button"
                onClick={() => onMutedChange(!isMuted)}
                aria-pressed={!isMuted}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs uppercase transition-colors duration-200 ${
                  isMuted
                    ? 'border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-950/30'
                    : 'border-emerald-500/20 bg-emerald-950/10 text-emerald-400 hover:bg-emerald-950/20'
                }`}
              >
                {isMuted ? (
                  <>
                    <VolumeX className="h-4 w-4" /> Muto
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" /> Attivo
                  </>
                )}
              </button>
            </div>

            {backups.length > 0 && (
              <div className="space-y-2 border-t border-bento-border pt-3">
                <button
                  type="button"
                  onClick={() => setShowBackups((v) => !v)}
                  aria-expanded={showBackups}
                  className="flex w-full items-center justify-between gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-colors duration-200 hover:text-slate-200"
                >
                  <span className="flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5" /> Backup automatici
                  </span>
                  <span className="text-slate-600">{backups.length}</span>
                </button>

                {showBackups && (
                  <div className="space-y-1.5 animate-fade-in">
                    {backups.map((backup) => (
                      <button
                        key={backup.savedAt}
                        type="button"
                        onClick={() => {
                          onRestoreBackup(backup);
                          setSettingsOpen(false);
                        }}
                        className="flex w-full flex-col items-start gap-0.5 rounded-lg border border-bento-border bg-bento-panel/40 px-2.5 py-1.5 text-left transition-colors duration-200 hover:border-theme-500/40 hover:bg-bento-button"
                      >
                        <span className="w-full truncate text-[11px] font-semibold text-slate-200">
                          {backup.title}
                        </span>
                        <span className="font-mono text-[9px] text-slate-500">
                          {new Date(backup.savedAt).toLocaleString('it-IT')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 border-t border-bento-border pt-3">
              {confirmingReset ? (
                <ConfirmInline
                  layout="block"
                  question="Sei sicuro? Questa azione cancellerà tutta la campagna corrente."
                  confirmLabel="Sì, resetta"
                  cancelLabel="Annulla"
                  onConfirm={() => {
                    onReset();
                    setConfirmingReset(false);
                    setSettingsOpen(false);
                  }}
                  onCancel={() => setConfirmingReset(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingReset(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-950/20 py-2 font-mono text-xs font-bold uppercase text-red-400 transition-colors duration-200 hover:bg-red-950/30 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Reset Completo
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}

function SettingsButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Impostazioni"
      aria-expanded={open}
      className={`rounded-xl border border-bento-border bg-bento-panel p-2 transition-colors duration-200 hover:bg-bento-button ${
        open ? 'text-slate-100 ring-2 ring-theme-500/20' : 'text-slate-300'
      }`}
    >
      <Settings className={`h-4 w-4 ${open ? 'animate-spin-slow' : ''}`} />
    </button>
  );
}
