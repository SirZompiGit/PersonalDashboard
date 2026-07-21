# FANTASIA — Documentazione Tecnica

> Questo documento descrive l'applicazione **come è realmente implementata**.
> La versione precedente elencava funzioni che non esistevano nel codice
> (punti ferita temporanei, Classe Armatura, condizioni, caratteristiche, tiri
> salvezza): sono raccolte nella sezione [Non implementato](#9-non-implementato).

## 1. Architettura

Applicazione a pagina singola in **React 19 + TypeScript strict + Vite 6 + Tailwind CSS v4**. Nessun backend proprio.

```
src/
  App.tsx           composizione e instradamento fra le modalità
  main.tsx          montaggio, ErrorBoundary, provider delle notifiche
  index.css         temi, token del design system, animazioni, utility
  theme.ts          definizione degli 8 temi e applicazione a <html>
  types.ts          modello dei dati
  components/       interfaccia (ui/ = pezzi riutilizzabili)
  hooks/            useCampaignState, useRoom, useToasts
  lib/              dice, healthBars, ids, participantRolls
  state/            campaignReducer, defaults, migrations
  utils/audio.ts    sintesi sonora via Web Audio API
```

### Flusso dello stato

Sorgente unica di verità: `CampaignState`, gestito da `campaignReducer` tramite azioni tipizzate. Nessun componente muta lo stato: tutti inviano azioni.

```
azione → historyReducer → campaignReducer → nuovo stato
                                              ├→ localStorage (ritardato 400 ms, con backup rotanti)
                                              ├→ BroadcastChannel → altre schede
                                              └→ Firebase (solo master, ritardato 500 ms)
```

Il ritardo è essenziale: senza, ogni tasto premuto in un'area di testo scriveva l'intero stato su disco e sulla rete.

### Cronologia (annulla e ripeti)

`state/history.ts` avvolge il reducer senza modificarlo: `campaignReducer` resta puro e sopra si accumulano gli stati passati. Due accortezze la rendono utilizzabile:

- **Fusione delle azioni continue.** Trascinare una barra vita o scrivere in una nota produce decine di azioni al secondo. Le azioni dello stesso tipo sullo stesso bersaglio, entro 700 ms, occupano un'unica voce: un solo `Ctrl+Z` annulla l'intero gesto, non un carattere.
- **Esclusione della sincronizzazione.** Lo stato che arriva da un'altra scheda entra con l'azione `SYNC`, che non registra nulla in cronologia: `Ctrl+Z` non deve annullare il lavoro fatto in un'altra finestra.

Il caso che risolve davvero non è l'eliminazione — quella aveva già l'annullamento dalla notifica — ma il click distratto su una barra vita, che prima cambiava gli HP senza alcun ritorno.

### Guardia anti-eco

Quando arriva un aggiornamento da un'altra scheda non va rimandato indietro, altrimenti due schede si rimbalzano lo stato all'infinito. `useCampaignState` confronta la serializzazione dello stato con l'ultima conosciuta: se coincidono non scrive nulla. È idempotente e non dipende dall'ordine con cui React esegue gli effetti.

## 2. Modello dei dati

```ts
interface CampaignState {
  title: string;
  scheduleDay: string;
  scheduleTime: string;
  players: Player[];          // { id, name, inventory[], bonus[] }
  healthBars: HealthBar[];
  notes: string;              // privati del master
  campaignNotes: string;      // pubblici, proiettati ai giocatori
  lastRoll: RollResult | null;
  rollHistory: RollResult[];  // ultimi 20
  isRollHidden: boolean;
  selectedDice: string;
  activePlayerId: string | null;
  theme: CampaignTheme;
  healthGroups: string[];
  diceLabels: string[];
}
```

### Normalizzazione

`state/migrations.ts` porta qualsiasi input a una campagna valida e completa. Non lancia mai eccezioni: nel caso peggiore restituisce una campagna vuota.

Serve in tre punti:

1. **Lettura da localStorage** — riconosce il formato legacy (campagna nuda) e quello attuale (`{ v: 2, state }`).
2. **Import di un file JSON** — ogni campo viene validato prima di entrare nello stato.
3. **Lettura dal database** — Firebase Realtime Database **omette le chiavi con array vuoti**, quindi anche una stanza sana arriva con campi mancanti.

La versione dello schema vive nell'involucro di localStorage, **non** dentro `CampaignState`: il payload scritto su Firebase resta identico a quello storico.

## 3. Aspetto: due assi indipendenti

| Asse | Attributo su `<html>` | Valori |
|---|---|---|
| Colore | `data-theme` | crimson, emerald, sapphire, amber, amethyst, abyss, rose, obsidian |
| Design | `data-style` | grimorio *(predefinito)*, arcano, runico |

Si combinano liberamente: 8 × 3.

**Colore.** I componenti usano classi **statiche** — `bg-theme-600`, `hover:bg-theme-500`, `focus:ring-theme-500/20` — che Tailwind genera davvero e che puntano a variabili vive. Le variabili sono registrate con `@property { syntax: "<color>" }`, quindi sono **interpolabili**: il cambio tema è una dissolvenza dell'intera palette senza una riga di JavaScript.

> Prima le classi venivano composte a runtime (`` `hover:${colors.hoverBg}` ``). Tailwind estrae i nomi dal testo sorgente a build time, quindi quelle classi non venivano mai generate: hover, anelli di focus e trasparenze erano no-op silenziosi in circa 127 punti.

**Design.** Sono tre linguaggi visivi distinti, non tre regolazioni dello stesso:

| Design | Forme | Superfici | Profondità | Tipografia |
|---|---|---|---|---|
| **Grimorio** | raggi 1–6px | opache | ombre morbide, filetto d'accento | serif, `tracking` 0.08em |
| **Arcano** | raggi 8–40px | vetro semi-trasparente + `backdrop-filter` | aloni nel colore del tema | lineare, `tracking` 0.14em |
| **Runico** | raggio 0 | piatte, bordi chiari ad alto contrasto | nessuna | monospace su tutto, separatori `double` |

L'implementazione non tocca i componenti. Tailwind v4 costruisce le utility di raggio e tipografia da variabili (`--radius-*`, `--font-*`) e genera `.font-display { font-family: var(--font-display) }`: ridefinire quelle variabili sotto `data-style` cambia l'aspetto ovunque. Dove serve di più — vetro, aloni, bordi — bastano poche regole che ridefiniscono `.bg-bento-panel`, `.border-bento-border` e `.shadow-*` sotto lo stesso selettore.

Il valore è salvato in `CampaignState.style`: campo **additivo**, assente nelle campagne più vecchie e normalizzato al predefinito, quindi il database resta compatibile. Anche i design rimossi in passato (`bento`, `compatto`) ricadono su `grimorio` senza rompere nulla.

## 4. Dadi

d3, d4, d6, d8, d10, d12, d20. `lib/dice.ts` centralizza tutto: `parseSides`, `rollDie`, `isCritical`, `isFumble`.

- `rollDie` usa `crypto.getRandomValues` con rifiuto della coda non divisibile, così i valori bassi non sono favoriti.
- **Etichette**: create, rinominate ed eliminate dall'utente; quella selezionata sopravvive al ricaricamento.
- **Lanci nascosti**: `isRollHidden` calcola il risultato ma lo maschera nello schermo condiviso.
- **Storico**: coda degli ultimi 20 lanci, il più recente evidenziato.
- Critico e fallimento hanno effetti sonori e visivi dedicati.

## 5. Barre della vita

Ogni barra ha nome, HP attuali e massimi, modalità colore (statico o gradiente a tre livelli), gruppo opzionale e testo personalizzato a 0 HP.

**Interazione** — Pointer Events con `setPointerCapture`: un solo percorso di codice per mouse, dito e penna. Si può toccare un punto della barra, trascinare, usare i pulsanti ±1/±5, oppure le frecce da tastiera (`Shift` per passi da 5). La barra è un `role="slider"` con i relativi attributi ARIA.

**Rendering** — fino a 60 punti la barra disegna un segmento per punto; oltre, passa a riempimento continuo. Il limite massimo è 999.

> Prima veniva creato un elemento per ogni punto ferita senza alcun limite, e il campo era `type="text"`, quindi gli attributi `min`/`max` non venivano applicati: digitare 100000 generava centomila nodi e bloccava il browser.

**Effetti** — durante un trascinamento gli HP cambiano molte volte al secondo: i suoni sono limitati a uno ogni 70 ms e le particelle di danno confluiscono in una sola con il totale accumulato.

## 6. Schermo condiviso

Componente isolato, apribile in tre modi: anteprima nella stessa pagina, finestra separata (`?shared=true`) per il secondo monitor, o vista dei giocatori collegati (`?shared=true&room=PIN`).

Mostra: ordine di turno con inventario e bonus del giocatore attivo, stato della salute (orizzontale o verticale, la scelta si ricorda), ultimo lancio del master, lanci dei giocatori, appunti campagna, appunti personali del giocatore e programmazione della sessione.

### Comportamento responsive

| Larghezza | Layout |
|---|---|
| ≥ 1024px | Tre colonne 3/5/4 |
| 768–1023px | Dado a tutta larghezza sopra, turni e salute affiancati |
| < 768px | Colonna singola: dado, salute, turni, appunti |

## 7. Versione X (multiplayer)

Firebase Realtime Database. Struttura **invariata** rispetto alle versioni precedenti, per compatibilità con le stanze esistenti:

```
rooms/{pin}
  campaign
  users/{userId}    → { id, name, assignedPlayerId, notes }
  participantRolls  → array, massimo 10 elementi
```

| Aspetto | Come funziona |
|---|---|
| Ciclo di vita | `useRoom` apre e **chiude** le sottoscrizioni; la sessione è in `sessionStorage` e riprende dopo un F5 |
| Chiusura stanza | Solo dal pulsante esplicito. Ricaricare la pagina non la distrugge |
| Utenti | `onDisconnect().remove()` sul nodo utente: è il server a ripulire, e viene riarmato dopo ogni riconnessione |
| Lanci | `runTransaction` sul nodo array: atomico, senza cambiare la forma del dato |
| Identità dei lanci | Etichetta `userId\|userName\|label`, codificata e letta solo da `lib/participantRolls` |
| Assenza di `.env` | La modalità X è disattivata con un messaggio; la Lite non ne risente |

## 8. Accessibilità e resilienza

- `ErrorBoundary` intercetta gli errori di render e permette di **scaricare i dati grezzi** prima di ricaricare.
- Le finestre modali dichiarano `role="dialog"`, trattengono il focus, si chiudono con `Esc` e lo restituiscono all'elemento di partenza.
- I pulsanti icona hanno `aria-label` e un suggerimento visivo coerente col tema.
- I controlli che compaiono al passaggio del mouse restano visibili dove l'hover non esiste (`@media (hover: none)`).
- Il riordino dei giocatori ha pulsanti su/giù oltre al trascinamento.
- Anello di focus uniforme su tutti gli elementi interattivi.
- Le cancellazioni si annullano dalla notifica; localStorage conserva gli ultimi 3 backup.

## 9. Non implementato

Funzioni descritte nella documentazione precedente ma **mai presenti nel codice**. Non sono state aggiunte in questo rework:

- Punti ferita temporanei
- Classe Armatura
- Sistema di condizioni (Avvelenato, Prono, Accecato, …)
- Caratteristiche e modificatori (Forza, Destrezza, Costituzione, Intelligenza, Saggezza, Carisma)
- Tiri salvezza e competenze
- Storico dei lanci dentro lo schermo condiviso
- Alternanza griglia/lista per le barre della vita (esiste orizzontale/verticale nello schermo condiviso)
