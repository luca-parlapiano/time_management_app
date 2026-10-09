# Laboratorio Dev

Apri **Dev → Avvia laboratorio** nell’app. In alternativa, avvia `npm run dev:renderer` e apri `/dev.html`: questa pagina funziona senza Electron.

Il laboratorio usa un DBProvider separato, il RepositoryDB reale e un bridge in memoria. Comandi, validazione, chiusura delle serie, statistiche ed editor sono quelli dell’app. Non verifica la persistenza SQLite o il percorso IPC. Non salva nulla fra ricaricamenti.

**Copia dati attuali nel laboratorio** sostituisce la sessione di prova con una copia dello snapshot personale. Le modifiche successive e **Azzera laboratorio** riguardano solo la copia. La pagina standalone non dispone dei dati personali.

## Prova ripetibile

Puoi creare direttamente **Nuova abitudine** o **Nuova routine**, scegliendo inizio, giorni della settimana, orario e traguardo. **Attività da compilare** seleziona il piano: la tabella mostra tutte le date previste fra **Piano dal** e **Piano al**, senza limitarsi alla settimana attuale. Per ricorrenze senza fine viene proposto il primo mese; puoi scegliere fino a 366 giorni per volta.

Ogni riga permette di impostare subito Fatto o Non fatto, anche nel futuro. I pulsanti **… su tutte le date** applicano gli esiti in ordine cronologico attraverso il comando reale del Provider, rileggendo lo snapshot dopo ogni salvataggio. Le date rimosse dalla chiusura della serie vengono saltate; in caso di errore restano confermati gli esiti già salvati e viene indicato il loro numero.

1. Azzera e crea **Esempio · 3 step**: abitudine quotidiana da due giorni fa, ore 10:00.
2. Segna **Fatto** ieri: percorso 1/3 e totale annuale 1. Seleziona ieri nel giorno da esaminare per vedere il 100% giornaliero.
3. Ripeti **Fatto**: resta un completamento; lo storico conserva due scritture.
4. Correggi in **Non fatto**: completamenti 0 e percentuale 0% in entrambe le viste.
5. Valuta tre occorrenze con **Fatto** o **Non fatto**: la serie si conclude. Correggere un esito aggiorna il risultato, senza riaprire la serie.
6. Registra **Fatto** su una data futura: Dev seleziona quel giorno e avanza automaticamente **Oggi simulato** per mostrarne subito le statistiche. Riporta manualmente la data simulata al giorno reale per vedere l’esito separato tra quelli futuri.
7. Cambia giorni, traguardo o nome con **Modifica abitudine**. Usa **Sposta / modifica** per modificare o eliminare una singola occorrenza.

Il pannello risultati legge lo snapshot dopo il salvataggio. Il calendario annuale usa l’anno del giorno da esaminare e il limite di **Oggi simulato**. Il grafico giornaliero confronta tutte le attività del laboratorio; il conteggio annuale segue il raggruppamento reale per attività, mentre il percorso si riferisce alla singola abitudine. Lo storico deduplicato mostra l’ultima correzione di ogni identità originale; il JSON è in sola lettura.

## Verifiche automatiche

- `npm test`: comprende isolamento delle istanze del repository, copia degli snapshot, revisioni e reset.
- Con Vite, apri `/tests/dev.browser.html`: verifica il Provider annidato, esiti ripetuti, correzioni, date future, chiusura/riapertura, cambi di giorni, errori atomici e isolamento dei dati copiati.
- `/tests/database.browser.html`: suite generale dei Provider, sempre su archivi di prova.
