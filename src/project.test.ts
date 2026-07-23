/**
 * Controlli sul progetto, non sulla logica.
 *
 * Verificano due classi di errori che passano inosservati: regole di sicurezza
 * che Firebase rifiuterebbe, e classi Tailwind in conflitto nella stessa
 * stringa. Entrambe si sono già verificate durante lo sviluppo.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Vitest esegue dalla radice del progetto.
const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

function sourceFiles(extension: RegExp): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (extension.test(entry.name)) out.push(full);
    }
  };
  walk(path.join(root, 'src'));
  return out;
}

describe('regole del Realtime Database', () => {
  // Firebase accetta i commenti nelle regole; per analizzarle qui vanno tolti.
  const parsed = JSON.parse(read('firebase.rules.json').replace(/^\s*\/\/.*$/gm, ''));

  it('restano JSON valido una volta tolti i commenti', () => {
    expect(parsed.rules).toBeTruthy();
  });

  /**
   * Ogni chiave senza punto iniziale è un percorso e il suo valore DEVE essere
   * un oggetto. Le chiavi di commento con valore array — che avevo usato in una
   * prima versione — vengono rifiutate dalla console.
   */
  it('non contengono chiavi di percorso con valore non valido', () => {
    const invalid: string[] = [];

    const walk = (node: Record<string, unknown>, at: string) => {
      for (const [key, value] of Object.entries(node)) {
        if (key.startsWith('.')) continue;
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          invalid.push(`${at}/${key}`);
          continue;
        }
        walk(value as Record<string, unknown>, `${at}/${key}`);
      }
    };

    walk(parsed.rules, '');
    expect(invalid).toEqual([]);
  });

  it('chiudono la radice', () => {
    expect(parsed.rules['.read']).toBe(false);
    expect(parsed.rules['.write']).toBe(false);
  });

  it('prevedono tutti i rami che l app scrive', () => {
    for (const branch of ['campaign', 'lastSeen', 'users', 'participantRolls']) {
      expect(parsed.rules.rooms.$pin[branch]).toBeTruthy();
    }
    expect(parsed.rules.roomMedia).toBeTruthy();
  });

  it('indicizzano lastSeen, senza cui la pulizia delle stanze sarebbe lenta', () => {
    expect(parsed.rules.rooms['.indexOn']).toContain('lastSeen');
  });

  /**
   * Se la regola fosse più stretta del limite dell'app, l'immagine si
   * salverebbe in locale ma verrebbe respinta dal database: comparirebbe al
   * master e a nessun altro.
   */
  it('lasciano passare le immagini fino al limite ammesso dall app', () => {
    const media = parsed.rules.roomMedia.$pin;
    for (const field of ['source', 'scene']) {
      const limit = Number(media[field]['.validate'].match(/length <= (\d+)/)![1]);
      expect(limit).toBeGreaterThanOrEqual(8 * 1024 * 1024);
    }
  });

  /**
   * Il linguaggio delle regole ha un'API molto più piccola di quella dell'SDK.
   * `numChildren()` per esempio esiste sul DataSnapshot del client ma NON nelle
   * regole: usarlo fa fallire la pubblicazione con
   * "No such method/property", e senza questo controllo l'errore si scopre
   * solo incollando le regole nella console.
   */
  it('usano solo metodi che esistono nel linguaggio delle regole', () => {
    const ALLOWED = new Set([
      // RuleDataSnapshot
      'val',
      'child',
      'parent',
      'hasChild',
      'hasChildren',
      'exists',
      'getPriority',
      'isNumber',
      'isString',
      'isBoolean',
      // Metodi delle stringhe
      'length',
      'contains',
      'beginsWith',
      'endsWith',
      'replace',
      'toLowerCase',
      'toUpperCase',
      'matches',
    ]);

    const unknown = new Set<string>();

    const walk = (node: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === 'string' && key.startsWith('.')) {
          for (const match of value.matchAll(/\.([a-zA-Z][a-zA-Z0-9]*)\s*\(/g)) {
            if (!ALLOWED.has(match[1])) unknown.add(match[1]);
          }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          walk(value as Record<string, unknown>);
        }
      }
    };

    walk(parsed.rules);
    expect([...unknown]).toEqual([]);
  });

  it('limitano i lanci vincolando la chiave, non contando i figli', () => {
    const roll = parsed.rules.rooms.$pin.participantRolls.$indice;
    expect(roll['.validate']).toContain('$indice.matches');
  });

  it('accettano gli extra di Dado+ sui lanci', () => {
    const roll = parsed.rules.rooms.$pin.participantRolls.$indice;
    expect(roll.detail).toBeTruthy();
    expect(roll.mode).toBeTruthy();
  });

  it('accettano la scheda che il giocatore modifica', () => {
    const sheet = parsed.rules.rooms.$pin.users.$userId.sheet;
    expect(sheet.inventory.$i.name).toBeTruthy();
    expect(sheet.bonus.$i.name).toBeTruthy();
    expect(sheet.stats.$i['.validate']).toContain('isNumber');
    // Le chiavi ignote restano rifiutate.
    expect(sheet.$altro['.validate']).toBe(false);
  });
});

describe('marchio', () => {
  it('tutte e tre le varianti del logo sono presenti', () => {
    for (const file of [
      'logo-fantasia.png',
      'logo-fantasia-black.png',
      'logo-fantasia-white.png',
    ]) {
      expect(fs.existsSync(path.join(root, 'public', file))).toBe(true);
    }
  });

  it('hanno tutte le stesse proporzioni, altrimenti si deformerebbero', () => {
    const ratios = ['logo-fantasia.png', 'logo-fantasia-black.png', 'logo-fantasia-white.png'].map(
      (file) => {
        const buffer = fs.readFileSync(path.join(root, 'public', file));
        // Intestazione PNG: larghezza a 16, altezza a 20.
        return buffer.readUInt32BE(16) / buffer.readUInt32BE(20);
      },
    );

    for (const ratio of ratios) {
      expect(ratio).toBeCloseTo(ratios[0], 3);
    }
  });

  it('il rapporto usato nel componente corrisponde ai file', () => {
    const buffer = fs.readFileSync(path.join(root, 'public', 'logo-fantasia-white.png'));
    const source = read('src/components/ui/Wordmark.tsx');
    const declared = source.match(/ASPECT = '(\d+) \/ (\d+)'/);

    expect(declared).toBeTruthy();
    expect(Number(declared![1])).toBe(buffer.readUInt32BE(16));
    expect(Number(declared![2])).toBe(buffer.readUInt32BE(20));
  });
});

/**
 * Le tracce delle risorse sono alte dieci pixel, e ogni design ridefinisce
 * padding, spazi e spessore del bordo di `.hp-track` con selettori a
 * specificità 0-2-0. `.hp-track.hp-track--thin` ha la stessa specificità: a
 * pari punteggio decide l'ordine nel file, quindi deve stare dopo. Spostarla
 * più in alto non darebbe alcun errore — semplicemente in Arcano e in Retro il
 * riempimento tornerebbe largo zero.
 */
describe('tracce sottili delle risorse', () => {
  // Senza commenti: i selettori citati nella spiegazione qui sopra sono prosa,
  // non regole, e conteggiarli falserebbe il controllo sull'ordine.
  const css = read('src/index.css').replace(/\/\*[\s\S]*?\*\//g, '');

  it('esistono e riportano in proporzione le misure dei design', () => {
    const rule = css.match(/\.hp-track\.hp-track--thin\s*\{[^}]*\}/);
    expect(rule).toBeTruthy();
    for (const property of ['border-width', 'padding', 'gap']) {
      expect(rule![0]).toContain(property);
    }
  });

  it('la regola sta dopo ogni blocco di design che le sovrascriverebbe', () => {
    const thinRule = css.search(/\.hp-track\.hp-track--thin\s*\{/);
    expect(thinRule).toBeGreaterThan(-1);

    const overrides = [
      ...css.matchAll(/\[data-style='[a-z]+'\]\s+\.(?:hp-track|border)\b[^{]*\{/g),
    ];
    expect(overrides.length).toBeGreaterThan(0);

    for (const match of overrides) {
      expect(match.index).toBeLessThan(thinRule);
    }
  });

  it('il componente applica davvero la classe', () => {
    expect(read('src/components/HealthBarItem.tsx')).toContain("'hp-track--thin'");
  });
});

describe('regole di Firestore', () => {
  it('lo chiudono del tutto, visto che l app non lo usa', () => {
    expect(read('firestore.rules')).toMatch(/allow read, write: if false;/);
    const usesFirestore = sourceFiles(/\.tsx?$/).some((file) =>
      /firebase\/firestore/.test(fs.readFileSync(file, 'utf8')),
    );
    expect(usesFirestore).toBe(false);
  });
});

/**
 * Due utility che scrivono la stessa proprietà hanno pari specificità: vince
 * quella che capita dopo nel CSS generato, non quella scritta per ultima
 * nell'attributo. È così che un `p-2` veniva ignorato a favore di un `p-4`.
 */
describe('classi Tailwind in conflitto', () => {
  const GROUPS: { name: string; test: RegExp }[] = [
    { name: 'padding', test: /^p-[\d.]+$/ },
    { name: 'padding-x', test: /^px-[\d.]+$/ },
    { name: 'padding-y', test: /^py-[\d.]+$/ },
    { name: 'margin', test: /^m-[\d.]+$/ },
    // `w-full` seguito da `w-20` non dà una larghezza di 20: sono la stessa
    // proprietà, e vince quella che capita dopo nel CSS, non nell'attributo.
    { name: 'width', test: /^w-(full|auto|screen|min|max|fit|px|[\d.]+|\[[^\]]+\])$/ },
    { name: 'height', test: /^h-(full|auto|screen|min|max|fit|px|[\d.]+|\[[^\]]+\])$/ },
    { name: 'display', test: /^(block|flex|grid|inline-flex|hidden)$/ },
    { name: 'flex-direction', test: /^flex-(row|col|row-reverse|col-reverse)$/ },
    { name: 'border-radius', test: /^rounded(-(none|sm|md|lg|xl|2xl|3xl|full))?$/ },
    { name: 'overflow', test: /^overflow-(auto|hidden|visible|scroll)$/ },
    { name: 'position', test: /^(static|fixed|absolute|relative|sticky)$/ },
  ];

  const hasVariant = (klass: string) => /^(?:[a-z0-9@:[\]/-]+:)+/.test(klass);

  it('non ce ne sono in nessun componente', () => {
    const conflicts: string[] = [];

    for (const file of sourceFiles(/\.tsx$/)) {
      const source = fs.readFileSync(file, 'utf8');
      const relative = path.relative(root, file);

      for (const match of source.matchAll(/className=(?:"([^"]+)"|\{`([^`]+)`\})/g)) {
        // Le interpolazioni sono ignote a compilazione: si escludono.
        const raw = (match[1] ?? match[2] ?? '').replace(/\$\{[^}]*\}/g, ' ');
        const classes = raw
          .split(/\s+/)
          .filter(Boolean)
          .filter((klass: string) => !hasVariant(klass));

        for (const group of GROUPS) {
          const hits = classes.filter((klass: string) => group.test.test(klass));
          if (hits.length > 1) conflicts.push(`${relative} — ${group.name}: ${hits.join(' + ')}`);
        }
      }
    }

    expect(conflicts).toEqual([]);
  });
});
