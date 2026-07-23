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
| Design | `data-style` | grimorio *(predefinito)*, arcano, runico, white, retro |

Si combinano liberamente: 8 × 3.

**Colore.** I componenti usano classi **statiche** — `bg-theme-600`, `hover:bg-theme-500`, `focus:ring-theme-500/20` — che Tailwind genera davvero e che puntano a variabili vive. Le variabili sono registrate con `@property { syntax: "<color>" }`, quindi sono **interpolabili**: il cambio tema è una dissolvenza dell'intera palette senza una riga di JavaScript.

> Prima le classi venivano composte a runtime (`` `hover:${colors.hoverBg}` ``). Tailwind estrae i nomi dal testo sorgente a build time, quindi quelle classi non venivano mai generate: hover, anelli di focus e trasparenze erano no-op silenziosi in circa 127 punti.

**Design.** Sono tre linguaggi visivi distinti, non tre regolazioni dello stesso:

| Design | Forme | Superfici | Profondità | Tipografia |
|---|---|---|---|---|
| **Grimorio** | raggi 1–6px | scure, opache | ombre morbide, filetto d'accento | serif, `tracking` 0.08em |
| **Arcano** | raggi 8–40px | vetro semi-trasparente + `backdrop-filter` | aloni nel colore del tema | lineare, `tracking` 0.14em |
| **Runico** | raggio 0 | piatte, bordi chiari ad alto contrasto | nessuna | monospace su tutto, separatori `double` |
| **White** | raggi 4–24px | chiare, testo scuro | ombre diffuse e leggere | lineare |
| **Retro** | raggio 0, bordi 3px | griglia vettoriale + superficie CRT | ombre dure senza sfocatura | pixel: Press Start 2P + VT323 |

**Retro** è l'unico che va oltre lo scambio di token, ed è il motivo per cui sembra un altro programma: cambia il **carattere tipografico** dell'intera interfaccia (i due font sono caricati in `index.html` apposta) e sovrappone una **superficie CRT** — scanline e vignettatura su `body::after`, sopra ogni cosa, modali compresi. Press Start 2P è molto largo: `.font-display` viene rimpicciolito con `font-size: 0.62em`, che scala in proporzione ovunque senza toccare una classe nei componenti.

**White** è l'unico su fondo chiaro. L'app nasce chiara su fondo scuro, quindi oltre ai token delle superfici servono regole che ribaltano la scala dei testi (`.text-slate-*`, `.text-white`) e i pochi colori Slate rimasti scritti a mano nei componenti. Per non andare a memoria, l'elenco delle classi da coprire è stato estratto dai sorgenti e confrontato con quelle rimappate.

L'implementazione non tocca i componenti. Tailwind v4 costruisce le utility di raggio e tipografia da variabili (`--radius-*`, `--font-*`) e genera `.font-display { font-family: var(--font-display) }`: ridefinire quelle variabili sotto `data-style` cambia l'aspetto ovunque. Dove serve di più — vetro, aloni, bordi — bastano poche regole che ridefiniscono `.bg-bento-panel`, `.border-bento-border` e `.shadow-*` sotto lo stesso selettore.

Il valore è salvato in `CampaignState.style`: campo **additivo**, assente nelle campagne più vecchie e normalizzato al predefinito, quindi il database resta compatibile. Anche i design rimossi in passato (`bento`, `compatto`, `sangue-scuro`, `sangue-chiaro`) ricadono su `grimorio` senza rompere nulla.

### Immagini (sfondo e scena)

Gestite da `hooks/useMedia.ts`, indipendenti dal design.

- **Sfondo**: livello fisso dietro l'app. `.app-surface` — il contenitore radice di ogni schermata — si fa da parte per lasciarlo vedere, mentre i pannelli mantengono la propria superficie e il testo resta leggibile. Ripetizione, sfocatura e intensità viaggiano come variabili CSS su `<html>`.
- **Scena**: riquadro sotto l'ordine di turno nella vista condivisa. Assente l'immagine, il riquadro non viene renderizzato.

**Non sono in `CampaignState`**, ma in una chiave di `localStorage` a sé: un'immagine in base64 dentro la campagna verrebbe riscritta per intero a ogni tasto premuto, sia su disco sia verso Firebase.

Nelle stanze viaggiano su `roomMedia/{pin}`, un ramo **separato** da `rooms/{pin}`. Non è un dettaglio: la sottoscrizione alla stanza riceve l'intero nodo a ogni modifica della campagna, quindi con le immagini lì dentro ogni tasto premuto negli appunti avrebbe rispedito centinaia di kilobyte a tutti i giocatori collegati.

Chi è collegato adotta le immagini del master; le proprie restano salvate e tornano all'uscita. Il valore ricevuto dal database passa sempre da `normalizeMedia`, quindi un dato corrotto non può rompere nulla.

Le immagini caricate vengono ridisegnate su canvas (1920px lo sfondo, 1280px la scena) e riesportate in JPEG: una foto da 6 MB scende tipicamente sotto i 400 KB. I PNG con trasparenza mantengono il formato originale.

## 4. Dadi

d2 (tondo), d3, d4, d6, d8, d10, d12, d20. `lib/dice.ts` centralizza tutto: `parseSides`, `rollDie`, `isCritical`, `isFumble`.

- `rollDie` usa `crypto.getRandomValues` con rifiuto della coda non divisibile, così i valori bassi non sono favoriti.
- Il **d2** è disegnato come cerchio, non come poligono: `DiceShape` ha un ramo dedicato che salta la geometria di baricentro e inradius.
- **Lanci nascosti**: `isRollHidden` calcola il risultato ma lo maschera nello schermo condiviso.
- **Storico**: coda degli ultimi 20 lanci, il più recente evidenziato.
- Critico e fallimento hanno effetti sonori e visivi dedicati.

### Dado+ (opzionale)

Attivo, sblocca tre extra; spento, resta il solo dado singolo senza etichette.

| Extra | Come funziona |
|---|---|
| Etichette | Create, rinominate ed eliminate dall'utente; quella selezionata sopravvive al ricaricamento |
| Vantaggio / Svantaggio | Due dadi, si tiene il più alto o il più basso. Resta una faccia sola, quindi il critico vale ancora |
| Dadi multipli (NdX) | Somma di più dadi dello stesso tipo. Una somma **non** fa critico: `scoresCrit(mode)` lo sopprime |

Ogni tiro produce `{ result, detail?, mode? }`: `detail` è la scomposizione leggibile ("4 + 2 + 5", "15 / 8"), `mode` distingue i casi. Sono campi **additivi** di `RollResult`, assenti sui lanci normali. Quando Dado+ è attivo valgono anche per il giocatore di turno.

## 5. Barre della vita

Ogni barra ha nome, HP attuali e massimi, modalità colore (statico, a tre livelli o sfumato), gruppo opzionale, testo personalizzato a 0 HP e allerta sotto il 25%.

### Risorse

Una barra può portare **fino a due risorse**: mana, scudo, frenesia, slot incantesimo. Sono barre più sottili con nome, valori e modalità colore propri, agganciate a quella della vita.

| Aspetto | Come funziona |
|---|---|
| Modello | `resources?: Resource[]` su `HealthBar`. Campo **additivo**, e **assente** quando la lista è vuota: una barra senza risorse si serializza identica a prima che le risorse esistessero, quindi le stanze e i salvataggi già creati non cambiano |
| Colore | `Resource` e `HealthBar` condividono `ColoredBar`, l'unico argomento di `getBarColor`: le risorse hanno le stesse tre modalità senza una riga di codice in più |
| Interazione | Stesso gesto della barra della vita. Il contenitore sensibile è più alto della traccia visibile — la spaziatura sta sull'asse che *non* viene misurato, così allarga l'area del dito senza falsare la conversione fra posizione e valore |
| Visibilità | Interruttore per singola risorsa: lo scudo di un mostro può essere pubblico e la sua frenesia no. Nella vista condivisa il master vede esattamente ciò che vedono i giocatori |
| Cronologia | `SET_RESOURCE_VALUE` ha una firma di fusione propria: un trascinamento intero occupa una sola voce di annullamento |
| Layout verticale | Le risorse affiancano la barra come colonnine da 10px e la scheda si allarga di 20px ciascuna; nome e valore stanno nel suggerimento, perché a quella larghezza un'etichetta non è leggibile |
| Segmenti | Passano al riempimento continuo a **12** invece che a 60: su dieci pixel cinquanta tacche sono una zebratura in cui non si distingue il pieno dal vuoto. Sotto la soglia servono davvero — slot incantesimo e cariche d'ira si contano a colpo d'occhio |
| Misure per design | `.hp-track--thin` riporta bordo, padding e spazi in proporzione. Senza, le misure pensate per i 32px della barra della vita azzeravano il riempimento: Arcano 4px di padding per lato (`10 − 2 − 8 = 0`), Retro 3px di padding più cornice da 3px (`10 − 6 − 6 = −2`). La regola sta **dopo** tutti i blocchi dei design perché ne pareggia la specificità: un test lo verifica, perché spostandola non si romperebbe nulla di visibile in compilazione |

Il limite di due non è tecnico ma di leggibilità: la barra della vita deve restare l'informazione dominante.

### Effetti di stato

Fino a **cinque** targhette con nome e colore (`statusEffects?: StatusEffect[]`, additivo e assente quando vuoto). Avvelenato, Stordito, Furioso. Ogni effetto ha il suo interruttore pubblico/nascosto, come le risorse. In orizzontale sono pastiglie col nome accanto alla barra; in verticale, dove non c'è spazio, solo le iniziali colorate.

### Riordino

Una **maniglia** trascinabile (l'unico elemento `draggable`, così non tocca il trascinamento degli HP) più **frecce su/giù** come alternativa da tocco e tastiera. `MOVE_HEALTH_BAR` e `REORDER_HEALTH_BAR` spostano **solo dentro il gruppo effettivo**: un gruppo che non esiste più conta come "Senza Gruppo", coerente con le sezioni mostrate.

**Interazione** — Pointer Events con `setPointerCapture`: un solo percorso di codice per mouse, dito e penna. Si può toccare un punto della barra, trascinare, usare i pulsanti ±1/±5, oppure le frecce da tastiera (`Shift` per passi da 5). La barra è un `role="slider"` con i relativi attributi ARIA.

**Rendering** — fino a 60 punti la barra disegna un segmento per punto; oltre, passa a riempimento continuo. Il limite massimo è 999.

> Prima veniva creato un elemento per ogni punto ferita senza alcun limite, e il campo era `type="text"`, quindi gli attributi `min`/`max` non venivano applicati: digitare 100000 generava centomila nodi e bloccava il browser.

**Effetti** — durante un trascinamento gli HP cambiano molte volte al secondo: i suoni sono limitati a uno ogni 70 ms e le particelle di danno confluiscono in una sola con il totale accumulato.

## 5-bis. Statistiche

Meccanica opzionale (`statsEnabled`). Sei valori per personaggio (`Player.stats?: number[]`, additivo e assente finché non toccato), coi nomi rinominabili a livello di campagna (`statLabels`, sempre sei voci). Solo un numero, senza modificatore. `lib/stats.ts` centralizza limiti (`clampStat`, 0–99), default e sigle; `StatBlock` è l'unico componente per i tre posti in cui compaiono:

- **scheda PG** in dashboard — griglia 3×2 modificabile dal master in tempo reale;
- **condivisione** — sola lettura, e **solo** per il giocatore di turno;
- **scheda personale del giocatore** in multiplayer — sempre visibile, modificabile se il master ha passato il controllo.

## 6. Schermo condiviso

Componente isolato, apribile in tre modi: anteprima nella stessa pagina, finestra separata (`?shared=true`) per il secondo monitor, o vista dei giocatori collegati (`?shared=true&room=PIN`).

Mostra: ordine di turno con inventario, bonus e statistiche del giocatore attivo, stato della salute (orizzontale o verticale, la scelta si ricorda), ultimo lancio del master, lanci dei giocatori, appunti campagna, appunti personali del giocatore e programmazione della sessione.

I gruppi di barre si possono **chiudere** anche qui, come nella dashboard. Lo stato usa una chiave distinta (`fantasia_shared_collapsed_groups`) apposta: è una preferenza di *chi guarda*, non della campagna, quindi il master che chiude un gruppo per sé non lo chiude a tutti i giocatori.

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
  users/{userId}    → { id, name, assignedPlayerId, notes, sheet? }
  participantRolls  → array, massimo 10 elementi
```

| Aspetto | Come funziona |
|---|---|
| Ciclo di vita | `useRoom` apre e **chiude** le sottoscrizioni; la sessione è in `sessionStorage` e riprende dopo un F5 |
| Chiusura stanza | Solo dal pulsante esplicito. Ricaricare la pagina non la distrugge |
| Utenti | `onDisconnect().remove()` sul nodo utente: è il server a ripulire, e viene riarmato dopo ogni riconnessione |
| Solo il turno tira | Un giocatore lancia i dadi solo se il suo personaggio è quello attivo; altrimenti vede "Non è il tuo turno" |
| Controllo ai giocatori | Interruttore globale (`playersCanEdit`, icona zaino). Attivo, il giocatore modifica la propria scheda e la scrive come **snapshot completo** su `users/{userId}/sheet` |
| Fusione | Il master — unico a scrivere `campaign` — copia lo `sheet` nel personaggio assegnato **solo quando quel campo cambia** (tracciato per utente), mai al cambio della campagna: così una sua modifica non viene mai sovrascritta. Alla revoca lo `sheet` viene rimosso |
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
