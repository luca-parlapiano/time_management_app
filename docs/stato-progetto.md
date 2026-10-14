# Stato del progetto

Rilevazione iniziale sul codice del 27 settembre 2026, aggiornata al 14 ottobre 2026.
[Indice documentazione](README.md).

Aggiornamento del 12 ottobre 2026: disponibili le [abitudini a ore](abitudini-ore.md),
con serie settimanali o mensili, riepilogo conclusivo e trofei, inserimento manuale da Oggi, stack delle ultime quattro
registrazioni espandibile, diario settimanale, piano facoltativo, backup v3 e SQLite 5.

Aggiornamento del 14 ottobre 2026: la creazione di nuove routine come tipo di
abitudine è stata rimossa. Le attività ricorrenti monitorate già salvate restano
modificabili e continuano a comparire in Oggi e nelle Statistiche con i loro esiti.
Una nuova routine composta da azioni è solo un’ipotesi da validare; vedi la
[valutazione di prodotto](piano-routine-gruppi-di-azioni.md).

## Implementato nel flusso principale

| Area | Disponibile |
| --- | --- |
| Oggi | Abitudini e attività ricorrenti già monitorate della giornata, con registrazione rapida degli esiti; esclude appuntamenti fissi e attività singole |
| Abitudini | Creazione e modifica con 1–12 step, giorni, orario e durata; percorso permanente nella Home e dettaglio degli esiti |
| Attività monitorate legacy | Vecchie routine senza step, conservate per modifica, esiti e statistiche; non più offerte come nuova scelta in Crea |
| Calendario | Visione completa della settimana e creazione di appuntamenti fissi che proteggono gli orari, oltre a navigazione, modifica e conflitti |
| Ricorrenze | Settimanali anche per attività flessibili, più giorni collegati, scadenza facoltativa, eccezioni e identità originale degli appuntamenti |
| Esiti | Fatto, non fatto, correzioni e storico mantenuto dopo eliminazione/svuotamento |
| Statistiche | Panoramica annuale giornaliera e vista per attività; regole nel documento dei Provider |
| Dati | SQLite in worker, transazioni, revisioni, inizializzazione diretta, import/export del solo backup corrente e copia precedente all’importazione |
| Personalizzazione | Profilo e obiettivi facoltativi, palette persistita in SQLite, icone, colori e copertine |

## Presente solo nel laboratorio

Il planner deterministico settimanale, il simulatore, la chat e i relativi flussi di
onboarding sono stati rimossi. Rimangono il runtime LLM sperimentale e gli strumenti
AI Lab, scollegati dal calendario principale; la loro presenza non dimostra che esista
un adapter addestrato e validato.

## Funzionalità proposte, non disponibili nel flusso principale

La [strategia di prodotto](strategia-prodotto-e-benchmark.md) propone una direzione
più ampia del calendario attuale. Restano da definire o implementare:

- inbox e sequenze composte da più attività ordinate, queste ultime da validare come bisogno prima dello sviluppo;
- modifica con data di decorrenza invece della sostituzione del calendario corrente;
- occasioni autonome «da collocare» per gli step; le abitudini a ore possono già esistere senza piano;
- notifiche facoltative per proporre uno spazio libero compatibile, senza prenotarlo o sostituire impegni automaticamente;
- timer e reminder azionabili; la durata reale può già essere registrata manualmente per le abitudini a ore;
- ripianificazione assistita compatibile con date, vincoli ed esiti;
- apprendimento delle preferenze e ranking personale degli slot;
- eventuale AI con proposta, validazione, anteprima e conferma.

La vista calendario giorno/mese e il drag-and-drop non sono implementati. “Oggi” è
una dashboard giornaliera, non un editor del calendario. Le viste
annuali delle statistiche non sono viste mensili di modifica del calendario.
Account, sincronizzazione, mobile e cloud restano esclusi dall’attuale perimetro.

## Lavoro tecnico aperto

- Il canale `planner-ai:interpret` è ancora esposto dal preload e non verifica il
  mittente come i canali database. La chat disabilitata non disabilita il bridge.
  Prima di riutilizzarlo, allineare i controlli alle regole Electron del progetto.
- Il controllo conflitti privilegia correttezza su archivi personali; non è una
  validazione delle prestazioni su grandi quantità di serie ed eccezioni.
- La build compila il progetto, ma mancano script di packaging/installer nel manifest.

Questi punti sono un inventario del lavoro aperto, non nuove funzionalità approvate.

## Evidenze di verifica

Per la rimozione della nuova scelta Routine del 14 ottobre 2026 sono passati
`npm run lint`, `npm run typecheck`, `npm test` e `npm run build`. Con archivi di
prova sono stati verificati il flusso Crea, l’editor di nuovi appuntamenti, la
modifica delle attività monitorate legacy e la conservazione dei loro esiti;
la suite browser dei Provider è passata. Non è stato usato il database personale.

Nella verifica del 27 settembre 2026, dopo la pulizia dei formati di importazione e il salvataggio della palette in SQLite, sono passati:

- `npm run lint`, senza warning;
- `npm run typecheck`;
- `npm test`: 57 test di calendario, archivio, utility, statistiche e inizializzazione del repository, 7 SQLite/worker e 5 della configurazione ESLint;
- `npm run build`, renderer ed Electron.

Il runtime Node ha emesso un avviso sull’API sperimentale SQLite. Le prove hanno usato
archivi temporanei, senza aprire il database reale dell’utente.

La verifica non includeva un avvio interattivo Electron, training/inferenza AI o una
nuova verifica dei dati dei concorrenti. La suite browser dei Provider è stata eseguita
con dati di prova e ha superato tutti i controlli. I test automatici del repository
coprono primo avvio, riapertura, archivi non validi, preferenze e errori di lettura/scrittura. I test SQLite verificano anche persistenza della palette, input non validi e scritture concorrenti con il calendario.
Le modalità di esecuzione sono nelle
[procedure di verifica](code-quality.md#procedure-di-verifica).

## Priorità e prossime decisioni

Questo è il riferimento unico per l’ordine proposto del lavoro. La sequenza non
costituisce approvazione delle funzionalità future.

1. Consolidare il calendario attuale con verifiche interattive di uso e recupero dati.
2. Confermare il segmento primario e intervistare cinque persone; verificare il valore
   del client desktop prima di considerare altri client o il cloud.
3. Verificare con gli utenti il flusso Oggi → esito → percorso dell'abitudine; poi
   scegliere tra occasioni senza orario o inbox. Le attività monitorate legacy
   conservano i propri esiti; un’eventuale nuova sequenza va validata nella dashboard.
   Confrontare checklist e timer, abitudini calendarizzate e flessibili, reminder utili
   e invasivi.
4. Definire le misure MVP: primo piano, primo traguardo di abitudine, ritorno a sette giorni
   e reminder azionati, quando queste funzioni saranno disponibili.
5. Valutare la disponibilità a pagare per sync, desktop, AI o backup prima di estendere
   il perimetro. Valutare funzioni AI solo dopo aver verificato il bisogno.

Restano da rimandare social, challenge, gamification, coaching wellness, integrazioni
salute, automazioni complesse, ulteriori statistiche avanzate, sync bidirezionale,
account/cloud, backup remoto, mobile e smartwatch. L’AI autonoma che modifica il piano
senza conferma resta esclusa, non una funzionalità rinviata.

### Percorso AI condizionato alla validazione

Se viene confermata l’utilità dell’inserimento assistito:

1. Definire un nuovo contratto `AIProposal` con `ProposalDiff`, coerente con il
   calendario corrente e adatto ad anteprime verificabili.
2. Estendere il modello dati per proposte, modifiche e feedback mancanti, riutilizzando
   persistenza e storico già implementati.
3. Integrare la validazione deterministica di slot, vincoli, capacità e buffer;
   allineare anche i controlli IPC indicati nel lavoro tecnico aperto.
4. Provare il flusso con un piccolo modello locale senza adattamento specifico.
5. Preparare 50–100 scenari annotati per estrazione, domande mancanti e JSON valido.
6. Valutare un adapter LoRA solo se i risultati giustificano il training.
7. Introdurre ranking personale locale solo dopo aver raccolto esiti reali.

Motivazioni, parametri e metriche restano nella [proposta AI](ai-modello-personalizzazione-locale.md);
il posizionamento e le ipotesi di valore nella [strategia di prodotto](strategia-prodotto-e-benchmark.md).
