# Documentazione Tecnica - Piattaforma Gestione TTRPG (Versione Lite)

## 1. Architettura di Base e Persistenza (Versione Lite)
La versione "Lite" della piattaforma è progettata per funzionare come un'applicazione web client-side (Single Page Application). L'intera logica di business e la gestione dello stato risiedono nel browser dell'utente.
- **Persistenza dei Dati:** Non essendoci un database centralizzato (es. Firebase), tutti i dati della sessione (appunti, statistiche, configurazioni) vengono salvati e recuperati utilizzando la Web Storage API (`localStorage`). Questo garantisce il funzionamento offline e la privacy totale dei dati, che non lasciano mai il dispositivo dell'utente.
- **Gestione dello Stato:** Lo stato globale dell'applicazione mantiene traccia di tutte le entità attive (dadi, giocatori, mostri, note).

## 2. Modulo di Lancio Dadi (Dice Roller)
Il modulo di generazione numeri casuali è progettato per simulare il lancio di dadi poliedrici utilizzati nei giochi di ruolo.
- **Dadi Supportati:** d3, d4, d6, d8, d10, d12, d20.
- **Etichettatura Dinamica:** Ogni lancio può essere associato a un'etichetta testuale (es. "Tiro Salvezza", "Attacco"). L'utente può creare, rinominare ed eliminare queste etichette in modo dinamico per velocizzare le operazioni ripetitive.
- **Gestione Lanci Nascosti:** È implementato un flag di visibilità che permette al Master di effettuare lanci "dietro lo schermo". Quando attivato, l'esito del lancio viene calcolato ma non viene trasmesso ai componenti di visualizzazione condivisa.
- **Storico Lanci:** L'applicazione mantiene una coda (FIFO) degli ultimi lanci effettuati nella sessione corrente, memorizzando tipo di dado, risultato ed eventuale etichetta.
- **Feedback Meccanico:** Riconoscimento automatico dei successi critici (risultato massimo del dado) e fallimenti critici (risultato pari a 1).

## 3. Gestore della Salute e Combattimento (Health Bars Manager)
Questo modulo gestisce le entità coinvolte negli incontri (Giocatori, Mostri, PNG).
- **Tracciamento Statistiche Vitali:** Per ogni entità vengono memorizzati:
  - Punti Ferita Attuali (HP)
  - Punti Ferita Massimi
  - Punti Ferita Temporanei
  - Classe Armatura (CA)
- **Gestione Gruppi:** Le entità possono essere raggruppate categoricamente (es. "Alleati", "Nemici") per facilitare la gestione durante i turni di combattimento.
- **Sistema di Condizioni:** Supporto per l'applicazione di tag di stato (es. Avvelenato, Prono, Accecato) a singole entità.
- **Calcolo Danni/Cure:** Interfaccia che permette di applicare operazioni matematiche rapide (+/-) al pool degli HP correnti, calcolando automaticamente l'impatto sui Punti Ferita Temporanei prima di intaccare gli HP base.

## 4. Schede Personaggio (Player Cards)
Un sistema per tracciare le statistiche a lungo termine dei personaggi.
- **Caratteristiche Principali:** Tracciamento dei punteggi e dei relativi modificatori (Forza, Destrezza, Costituzione, Intelligenza, Saggezza, Carisma).
- **Tiri Salvezza e Abilità:** Registrazione delle competenze (Proficiencies) specifiche del sistema di gioco.
- **Blocco Note Integrato:** Ogni scheda possiede un proprio campo di testo libero per annotazioni specifiche del personaggio (inventario, background).

## 5. Sistema di Annotazione (Master Notes)
Un editor di testo diviso in due ambiti di visibilità logica:
- **Appunti Campagna:** Destinati a contenere informazioni pubbliche o di lore. Il contenuto di questa sezione può essere proiettato sulla Vista Condivisa.
- **Appunti Personali:** Spazio di lavoro privato del Master, rigorosamente escluso dalla trasmissione ai giocatori.

## 6. Schermo Condiviso (Shared View)
Un componente isolato progettato per essere estratto in una finestra separata del browser e proiettato su un secondo schermo.
- **Sincronizzazione Dati (Lite Mode):** Nella versione Lite (no WebSocket/Cloud), la vista condivisa legge i dati dallo stesso `localStorage` (o dallo stato condiviso in memoria, se nella stessa finestra) o comunica tramite la Window Object API se aperta in un popup locale.
- **Elementi Mostrati:**
  - **Ultimo Lancio Pubblico:** Mostra l'esito del dado (a meno che non sia stato flaggato come Nascosto).
  - **Storico Lanci (Mini-View):** Espone in modo compatto gli ultimi 5 lanci effettuati dal Master.
  - **Stato dei Giocatori:** Mostra la salute, le condizioni e le statistiche base in formato "dashboard", omettendo le informazioni che il Master ha deciso di non rivelare (es. i punti ferita esatti dei nemici).
  - **Lore/Appunti:** Rendering in sola lettura del modulo Appunti Campagna.
  - **Programmazione:** Visualizzazione della data/ora della prossima sessione.

## 7. Configurazione e Personalizzazione (Settings & Themes)
Il sistema supporta la configurazione di variabili d'ambiente a runtime gestite dall'utente.
- **Temi:** Modifica del set di colori (es. Crimson, Cobalt, Emerald) e variabili CSS associate all'interfaccia.
- **Layout Flessibile:** Possibilità di passare da visualizzazioni a griglia a visualizzazioni a lista per l'Health Bars Manager, al fine di ottimizzare lo spazio su schermi di dimensioni differenti.
