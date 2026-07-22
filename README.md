<div align="center">
  <img src="public/logo-fantasia.png" alt="Fantasia" height="110" />
</div>

<p align="center">
  Plancia di comando per sessioni di gioco di ruolo da tavolo.
</p>

---

Partecipanti e ordine di turno, lancio dei dadi con etichette, barre della vita interattive, schede giocatore, appunti privati e pubblici, e uno schermo condiviso da proiettare ai giocatori.

Funziona in due modalità:

| Modalità | Cosa fa | Serve Firebase? |
|---|---|---|
| **Lite** | Tutto in locale. I dati restano nel browser e si sincronizzano fra le schede aperte. Lo schermo condiviso si apre in una finestra separata per il secondo monitor. | No |
| **X** | Sessione condivisa in tempo reale. Il master apre una stanza con un PIN a 6 cifre, i giocatori entrano, tirano i dadi e hanno appunti privati. | Sì |

## Avvio

**Requisiti:** Node.js 20 o superiore.

> ⚠️ **Il nome della cartella non deve contenere `&`.**
> npm risolve i comandi passando dal `PATH`, e la e commerciale spezza il
> percorso: `npm run dev`, `npm run build`, `npm run lint` e `npm test`
> falliscono tutti con *"...non è riconosciuto come comando interno o esterno"*.
> Non è un problema del progetto, è una limitazione di npm su Windows.
> Se la cartella si chiama `d&d-campaign-master-dashboard(1)`, rinominala
> (per esempio in `fantasia`) prima di iniziare.

```bash
npm install
npm run dev      # http://localhost:3000
```

Il server ascolta anche sull'IP di rete (`--host=0.0.0.0`), così i giocatori possono collegarsi dal telefono sulla stessa Wi-Fi.

Altri comandi:

```bash
npm run lint       # controllo dei tipi (TypeScript strict)
npm test           # 106 verifiche automatiche
npm run test:watch # le stesse, rieseguite a ogni salvataggio
npm run build      # build di produzione in dist/
npm run preview    # anteprima della build
```

### Cosa coprono i test

Stanno accanto al codice che verificano (`src/**/*.test.ts`) e non toccano il
DOM, quindi girano in mezzo secondo.

| File | Cosa protegge |
|---|---|
| `state/migrations.test.ts` | Che nessun dato malformato possa rendere l'app irrecuperabile |
| `state/history.test.ts` | Annulla e ripeti, inclusa la fusione dei gesti continui |
| `state/campaignReducer.test.ts` | Le mutazioni e il ripristino dopo una cancellazione |
| `lib/*.test.ts` | Dadi, barre vita, identificatori, formato dei lanci sul database |
| `theme.test.ts` | Che i temi salvati restino leggibili e i design rimossi non rompano nulla |
| `components/DiceShape.test.ts` | La geometria delle sagome dei dadi |
| `project.test.ts` | Regole Firebase valide e nessuna classe Tailwind in conflitto |

## Configurare la Versione X

```bash
cp .env.example .env
```

Compila i valori dalla console Firebase (Impostazioni progetto → Le tue app → Configurazione SDK) e riavvia il server di sviluppo.

Serve un **Realtime Database**, non Firestore. `VITE_FIREBASE_DATABASE_URL` è obbligatorio se il database non è nella regione predefinita.

Senza `.env` la Versione X appare disattivata con una spiegazione, e la Lite continua a funzionare normalmente.

### Struttura dati nel database

```
rooms/{pin}
  campaign          → la campagna del master
  users/{userId}    → { id, name, assignedPlayerId, notes }
  participantRolls  → array degli ultimi 10 lanci dei giocatori
```

Gli utenti vengono rimossi dal server quando la scheda si chiude (`onDisconnect`). La stanza si elimina **solo** premendo "Chiudi Stanza": ricaricare la pagina non la distrugge, e la sessione riprende da dove era.

### Regole di sicurezza

Due file, per due database diversi:

| File | Database | Cosa fa |
|---|---|---|
| [`firestore.rules`](firestore.rules) | Cloud Firestore | **Lo chiude del tutto.** Fantasia non usa Firestore: lasciarlo aperto significa avere un database pubblico che paghi tu, senza alcun vantaggio |
| [`firebase.rules.json`](firebase.rules.json) | Realtime Database | Chiude la radice, limita i PIN a 6 cifre, valida ogni campo e rifiuta quelli sconosciuti |

```bash
firebase deploy --only firestore:rules   # nessun rischio: l'app non usa Firestore
firebase deploy --only database          # da provare subito dopo averlo applicato
```

Le regole del Realtime Database sono più strette della configurazione di test: dopo averle applicate, crea una stanza, falla raggiungere da un giocatore e fagli tirare un dado.

**Limite noto:** senza autenticazione non si distingue il master dai giocatori, quindi chiunque conosca il PIN può modificare la stanza. Separare i ruoli richiederebbe Firebase Authentication.

## Scorciatoie da tastiera

| Tasto | Azione |
|---|---|
| `?` | Apre l'elenco delle scorciatoie |
| `1` – `7` | Seleziona il dado (d3 → d20) |
| `Spazio` o `R` | Lancia il dado |
| `Ctrl/Cmd + Z` | Annulla l'ultima modifica |
| `Ctrl/Cmd + Shift + Z` | Ripeti |
| `Ctrl/Cmd + S` | Esporta la campagna in JSON |
| `Esc` | Chiude finestre e anteprima condivisa |
| `←` `→` `↑` `↓` | Regola gli HP della barra che ha il focus (`Shift` per passi da 5) |

Le scorciatoie si disattivano da sole mentre si scrive in un campo di testo.

Si può anche **trascinare un file JSON sulla pagina** per importarlo.

## Aspetto

Due assi indipendenti, combinabili liberamente:

- **Colore** — 8 temi: Vampiro, Druido, Mago, Oste, Stregone, Monaco, Bardo, Ladro
- **Design** — 3 linguaggi visivi distinti, non tre regolazioni dello stesso:

| Design | Forme | Superfici | Tipografia |
|---|---|---|---|
| **Grimorio** *(predefinito)* | angoli quasi vivi, bordi spessi | scure e opache, filetto d'accento | serif spaziato |
| **Arcano** | curve ampie | vetro sfocato, aloni di luce nel colore del tema | lineare, leggera |
| **Runico** | nessuna curva | piatte, nessuna ombra, bordi chiari netti | monospace ovunque |
| **White** | curve morbide | chiare, testo scuro, ombre diffuse | lineare |
| **Retro** | squadrate, cornici da 3px | griglia vettoriale, **scanline CRT** sopra tutto | pixel (Press Start 2P + VT323) |

Il colore scelto pilota tutti e cinque.

### Immagini

Dalle impostazioni si caricano due immagini, da file o da indirizzo web:

| Immagine | Dove compare |
|---|---|
| **Sfondo** | Dietro tutta l'interfaccia, con **ripetizione a mosaico**, **sfocatura** e **intensità** regolabili |
| **Scena** | In un riquadro sotto l'ordine di turno nella vista condivisa — mappe, ritratti, indizi. Se non c'è, il riquadro non esiste affatto |

In una stanza multiplayer entrambe vengono **trasmesse ai giocatori**: chi entra
vede quelle scelte dal master. Le proprie restano salvate e tornano all'uscita.

Le immagini vengono ridotte prima di essere conservate (1920px lo sfondo, 1280px
la scena): senza questo passaggio una foto da telefono esaurirebbe lo spazio del
browser, impedendo il salvataggio della campagna, e andrebbe scaricata per intero
da ogni giocatore.

Nella vista condivisa ci sono anche **schermo intero** e **zoom**, utili quando lo schermo è un proiettore o una TV a qualche metro di distanza.

## Dati e sicurezza

- La campagna si salva da sola nel browser (`localStorage`), con **backup automatici rotanti** ripristinabili dalle impostazioni.
- Le cancellazioni si possono **annullare** dalla notifica che compare in basso.
- `Esporta JSON` produce un file di backup completo; `Importa JSON` lo rilegge validando ogni campo.

## Struttura del progetto

```
src/
  components/     interfaccia; ui/ contiene i pezzi riutilizzabili
  hooks/          useCampaignState (stato + persistenza), useRoom (stanza), useToasts
  lib/            dadi, barre vita, identificatori, lanci dei partecipanti
  state/          reducer, valori iniziali, normalizzazione e migrazione
  utils/audio.ts  effetti sonori sintetizzati con la Web Audio API
```

Il tema è un attributo su `<html>` più un set di variabili CSS definite in `src/index.css`: i componenti usano classi statiche (`bg-theme-600`, `hover:bg-theme-500`) che si ricolorano da sole, con una dissolvenza.

`_archive/` contiene il codice precedente al rework e i vecchi script di patch. Non fa parte della build ed è escluso da git.
