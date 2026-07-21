# FANTASIA

Plancia di comando per sessioni di gioco di ruolo da tavolo: partecipanti e ordine di turno, lancio dei dadi con etichette, barre della vita interattive, schede giocatore, appunti privati e pubblici, e uno schermo condiviso da proiettare ai giocatori.

Funziona in due modalità:

| Modalità | Cosa fa | Serve Firebase? |
|---|---|---|
| **Lite** | Tutto in locale. I dati restano nel browser e si sincronizzano fra le schede aperte. Lo schermo condiviso si apre in una finestra separata per il secondo monitor. | No |
| **X** | Sessione condivisa in tempo reale. Il master apre una stanza con un PIN a 6 cifre, i giocatori entrano, tirano i dadi e hanno appunti privati. | Sì |

## Avvio

**Requisiti:** Node.js 20 o superiore.

```bash
npm install
npm run dev      # http://localhost:3000
```

Il server ascolta anche sull'IP di rete (`--host=0.0.0.0`), così i giocatori possono collegarsi dal telefono sulla stessa Wi-Fi.

Altri comandi:

```bash
npm run lint     # controllo dei tipi (TypeScript strict)
npm run build    # build di produzione in dist/
npm run preview  # anteprima della build
```

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

Il file [`firebase.rules.json`](firebase.rules.json) contiene regole di riferimento **non applicate**: leggile e valutale prima di usarle, perché sono più strette della configurazione di test predefinita.

```bash
firebase deploy --only database
```

Senza regole, chiunque può leggere e scrivere qualsiasi stanza indovinando un PIN a 6 cifre.

## Scorciatoie da tastiera

| Tasto | Azione |
|---|---|
| `1` – `7` | Seleziona il dado (d3 → d20) |
| `Spazio` o `R` | Lancia il dado |
| `Ctrl/Cmd + S` | Esporta la campagna in JSON |
| `Esc` | Chiude la finestra aperta |
| `←` `→` `↑` `↓` | Regola gli HP della barra che ha il focus (`Shift` per passi da 5) |

Le scorciatoie si disattivano da sole mentre si scrive in un campo di testo.

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
