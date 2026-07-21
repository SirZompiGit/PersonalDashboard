/**
 * Elenco delle scorciatoie.
 *
 * Le scorciatoie esistevano già ma non c'era alcun modo di scoprirle
 * dall'interfaccia: si potevano conoscere solo leggendo il README.
 */

import { useEffect } from 'react';
import { Keyboard } from 'lucide-react';
import { Modal } from './ui/Modal';

interface ShortcutsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GROUPS: { title: string; items: { keys: string[]; action: string }[] }[] = [
  {
    title: 'Dadi',
    items: [
      { keys: ['1', '…', '7'], action: 'Seleziona il dado, da d3 a d20' },
      { keys: ['Spazio'], action: 'Lancia il dado selezionato' },
      { keys: ['R'], action: 'Lancia il dado selezionato' },
    ],
  },
  {
    title: 'Barre della vita',
    items: [
      { keys: ['←', '→'], action: 'Regola gli HP della barra che ha il focus' },
      { keys: ['Shift', '+', '←/→'], action: 'Regola gli HP a passi di 5' },
      { keys: ['Home'], action: 'Porta la barra a 0' },
      { keys: ['Fine'], action: 'Porta la barra al massimo' },
    ],
  },
  {
    title: 'Campagna',
    items: [
      { keys: ['Ctrl', '+', 'Z'], action: 'Annulla l’ultima modifica' },
      { keys: ['Ctrl', '+', 'Shift', '+', 'Z'], action: 'Ripeti' },
      { keys: ['Ctrl', '+', 'S'], action: 'Esporta la campagna in JSON' },
      { keys: ['Trascina'], action: 'Rilascia un file JSON sulla pagina per importarlo' },
    ],
  },
  {
    title: 'Interfaccia',
    items: [
      { keys: ['?'], action: 'Apri questo elenco' },
      { keys: ['Esc'], action: 'Chiudi finestre e anteprima condivisa' },
    ],
  },
];

export function ShortcutsPanel({ open, onOpenChange }: ShortcutsPanelProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '?') return;

      // Il punto interrogativo si scrive: mentre si compila un campo la
      // scorciatoia non deve attivarsi.
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
      ) {
        return;
      }

      event.preventDefault();
      onOpenChange(true);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpenChange]);

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      size="md"
      fitContent
      title={
        <>
          <Keyboard className="h-4 w-4 text-theme-500" /> Scorciatoie
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 overflow-y-auto sm:grid-cols-2 scrollbar-thin">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 font-mono text-[11px] font-bold uppercase tracking-widest text-theme-500">
              {group.title}
            </h3>
            <ul className="space-y-1.5">
              {group.items.map((item) => (
                <li key={item.action} className="flex items-start justify-between gap-3">
                  <span className="flex shrink-0 items-center gap-1">
                    {item.keys.map((key, index) =>
                      key === '+' || key === '…' ? (
                        <span key={index} className="text-[10px] text-slate-600">
                          {key}
                        </span>
                      ) : (
                        <kbd
                          key={index}
                          className="rounded border border-bento-border bg-bento-void px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-300"
                        >
                          {key}
                        </kbd>
                      ),
                    )}
                  </span>
                  <span className="text-right text-xs leading-snug text-slate-400">
                    {item.action}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-5 border-t border-bento-border pt-3 text-[11px] text-slate-600">
        Le scorciatoie si disattivano da sole mentre scrivi in un campo di testo.
      </p>
    </Modal>
  );
}
