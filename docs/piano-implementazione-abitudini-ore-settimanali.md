# Piano di implementazione: abitudini con obiettivo di ore settimanali

> Piano iniziale dell’11 ottobre 2026, conservato come riferimento progettuale.
> Implementato il 12 ottobre 2026: il comportamento disponibile e le differenze
> rispetto al piano sono documentati in [Abitudini a ore](abitudini-ore.md).

## 1. Obiettivo e prima versione

Permettere di imparare un’abitudine scegliendo quanto tempo dedicarle ogni settimana
e registrando sul calendario le sessioni realmente svolte. L’esperienza riprende il
diario dell’utente: **data, durata, nota su cosa è stato fatto**.

La nuova modalità si affianca alle abitudini a step. Non richiede giorni fissi,
orari, un numero di ripetizioni o un timer. La pianificazione è facoltativa e non
fa avanzare il progresso finché l’utente non registra il tempo effettivo.

### Esempio guida

«Imparare a programmare», obiettivo **6 ore a settimana**:

| Data | Tempo svolto | Nota |
| --- | ---: | --- |
| Lunedì 12 ottobre 2026 | 2 h | Studio dei componenti React |
| Mercoledì 14 ottobre 2026 | 1 h 30 min | Esercizi sui form |
| Sabato 17 ottobre 2026 | 1 h | Correzione degli esercizi |

La scheda mostra **4 h 30 min / 6 h · mancano 1 h 30 min**. Un appuntamento di due
ore per domenica rimane tempo pianificato. Registrare domenica 1 h 30 min porta a
6 / 6 ore; registrare 2 h porta a 6 h 30 min / 6 h. Lunedì 19 parte un nuovo
conteggio, mentre sessioni e risultato della settimana precedente restano consultabili.

### Ambito della consegna

- Creazione, modifica e archiviazione dell’abitudine a ore.
- Obiettivo settimanale con decorrenza e storico dei cambiamenti.
- Aggiunta manuale, modifica e rimozione delle sessioni svolte.
- Diario consultabile per settimana e registrazioni visibili nel calendario.
- Appuntamenti facoltativi collegati all’abitudine e registrazione del tempo dal loro dettaglio.
- Riepilogo in Abitudini e Oggi, con storico settimanale dedicato.
- Persistenza locale, migrazione, backup e ripristino completi.

Timer, notifiche, pianificazione automatica, AI, sincronizzazione, nuovi client
Android/iOS, conversione di un’abitudine a step e nuovi trofei sono fuori da questa
consegna. L’interfaccia resta adattabile agli schermi stretti, senza introdurre
nuove dipendenze per questa funzione.

## 2. Punto di partenza verificato

| Area | Situazione nel codice | Intervento necessario |
| --- | --- | --- |
| Scelta iniziale | `CreationChoiceDialog` mostra «Come vuoi imparare?» con step e routine | Aggiungere la scelta «Con un obiettivo di ore» |
| Modello | `Habit` richiede `stepTarget`; `HabitDraft` richiede giorni e orario | Distinguere esplicitamente le due modalità |
| Validazione | `validateHabits` richiede serie ricorrenti collegate per ogni abitudine | Consentire un’abitudine a ore senza piano |
| Fine della serie | `reconcileHabitCompletion` calcola chiusura e fine piano per tutte le abitudini | Applicare questa logica soltanto agli step |
| Calendario | Ogni `CalendarItem` ha inizio e fine; l’identità è `sourceId` + `occurrenceDate` originale | Tenere il diario senza orario separato dagli appuntamenti |
| Esiti | `OutcomeRecord` contiene Fatto/Non fatto, senza durata effettiva | Archivio specifico delle sessioni di tempo |
| Statistiche | `StatisticsRepository` misura eventi; può raggruppare fonti anche per titolo | Letture a minuti separate, sempre per ID abitudine |
| Persistenza | Backup v2, SQLite `user_version = 4`, snapshot con revisione e copia precedente | Migrazione e aggiornamento di tutti i percorsi di lettura/scrittura |
| Utility | `weekStart`, `addDays`, `validDate`, `percentage`, controlli numerici già presenti | Riutilizzarle; aggiungere solo la formattazione delle durate mancante |

Il [piano Routine](piano-implementazione-routine.md) propone un altro lavoro, non
ancora implementato. Non ne assumiamo i modelli o le migrazioni come disponibili.
Se viene sviluppato prima, riallineare versioni e nomenclatura prima di iniziare.

## 3. Esperienza nell’app

### Scelta del metodo e creazione

Nella modale «Come vuoi imparare?» aggiungere una scheda con icona del tempo:

- Titolo: **Con un obiettivo di ore**.
- Descrizione: «Scegli il tempo da dedicare ogni settimana e registra i tuoi progressi».
- Azione: **Scegli le ore**.

Con tre scelte, verificare larghezza della modale e disposizione delle schede senza
comprimere i testi. Riutilizzare stile, focus e preferenza di movimento ridotto già
presenti. La routine attuale conserva il proprio flusso; la sua eventuale revisione
appartiene al piano dedicato.

L’editor raccoglie nome, motivazione facoltativa, icona, colore, data di inizio e
obiettivo espresso in ore e minuti. Non propone giorni o orari obbligatori.
Il salvataggio apre il dettaglio dell’abitudine: non esiste necessariamente una
«prima occorrenza» a cui spostare il calendario.

### Registrare il tempo

Il comando **Aggiungi tempo** è disponibile nel dettaglio, in Oggi e dalla giornata
del calendario. Il modulo propone data, ore/minuti e nota facoltativa; la data
parte da quella selezionata, oppure da oggi.

Sono ammesse più sessioni nella stessa giornata. Il diario mostra ogni sessione,
il totale giornaliero e il totale settimanale, con modifica e rimozione accessibili
anche da tastiera. In caso di errore conserva i campi e mostra il problema vicino
al comando, senza dichiarare un salvataggio riuscito.

### Abitudini e Oggi

- In Abitudini, i due metodi condividono elenco e identità visiva ma hanno dettagli
  diversi: percorso a step oppure obiettivo e diario settimanale.
- La scheda a ore mostra intervallo della settimana, svolto/obiettivo, tempo
  rimanente e comando Aggiungi tempo. La settimana corrente è la selezione iniziale.
- Lo storico consente di andare avanti/indietro di una settimana e tornare a oggi.
- In Oggi, mostrare un riepilogo delle abitudini a ore attive anche senza appuntamenti
  previsti per la giornata. Non inserirle fra le serie concluse o nei pallini degli step.
- Barra laterale: per gli step resta la prossima occasione; per le ore si mostra
  il progresso della settimana e, se presente, il prossimo appuntamento.
- Archiviare un’abitudine a ore è una scelta esplicita. Raggiungere il target di una
  settimana non chiude l’abitudine e non la sposta automaticamente in archivio.

### Calendario: diario e pianificazione

Le registrazioni senza orario appaiono in un’area **Tempo registrato** della
giornata, sia nella vista settimanale sia nell’agenda. Non creare appuntamenti
fittizi a mezzanotte e non occupare spazio nella griglia degli orari.

Il comando distinto **Pianifica una sessione** crea un appuntamento singolo o
ricorrente collegato all’abitudine, usando durata prevista e controlli dei conflitti
già esistenti. Nel dettaglio mostrare **Registra tempo svolto**, proponendo la
durata pianificata come valore modificabile, mai confermato automaticamente.

Per una sessione collegata, il blocco orario rimane l’appuntamento; il riepilogo
giornaliero può includerne i minuti una sola volta. Il dettaglio indica chiaramente
«previsto» e «svolto». Una sessione senza orario non viene trascinata sulla griglia.

## 4. Regole di dominio proposte

Questi sono valori iniziali concreti per sviluppare e verificare la funzione;
eventuali cambiamenti vanno esplicitati prima di implementarli.

### Settimane e obiettivi

- Settimana civile da lunedì a domenica, identificata dalla data del lunedì, non
  dal solo numero di settimana. Usare `weekStart`, anche al cambio di anno.
- Durate salvate come minuti interi: nessun conteggio con ore decimali in virgola mobile.
- Obiettivo proposto: da 1 a 10.080 minuti/settimana; sessione da 1 a 1.440 minuti.
  Controllare anche che il totale netto per abitudine/giorno non superi 1.440 minuti.
- La data di inizio può essere passata, oggi o futura. Le sessioni non possono
  precederla; quelle effettive non possono essere future rispetto alla data di riferimento.
- Se l’inizio è a metà settimana, mostrare «Prima settimana parziale» e mantenere
  il target scelto senza riproporzionarlo implicitamente. La settimana precedente
  all’inizio non è una settimana a zero.
- Un cambio di target decorre dal lunedì successivo. Mostrare la data prima del
  salvataggio; consentire di correggere o annullare una variazione ancora futura.
  Per un’abitudine che non è ancora iniziata si può correggere il target iniziale.
- Non riscrivere i target delle settimane trascorse o della settimana in corso.
- Il nuovo lunedì non richiede job o scritture: il conteggio deriva dall’intervallo
  richiesto. Nessun riporto di ore eccedenti o debito di ore mancanti.

### Sessioni e correzioni

- Il totale usa soltanto sessioni confermate e non rimosse. Un appuntamento,
  l’assenza di sessione o «Non fatto» non aggiungono minuti.
- La prima versione non aggiunge nuovi esiti a `ItemOutcome`: per gli appuntamenti
  a ore usa l’azione specifica di registrazione. Le ore parziali sono durate reali,
  non un terzo esito da inserire negli step.
- Una modifica sostituisce i minuti considerati per la stessa sessione. Conservare
  una traccia delle correzioni e delle rimozioni, senza sommarne le revisioni.
- Per un appuntamento è ammessa una sola sessione collegata, identificata da
  `(sourceId, occurrenceDate)` originale. Riaprire il comando modifica quella sessione.
  I minuti di più momenti dedicati allo stesso appuntamento si aggiornano in essa.
- Se è già stata inserita una sessione manuale, il dettaglio dell’appuntamento
  permette di collegare quella esistente della stessa abitudine oppure crearne una.
  Non dedurre duplicati da titolo, giorno o durata: due sessioni uguali possono essere reali.
- Spostare un appuntamento conserva il collegamento originale. Dopo la registrazione,
  lo spostamento del piano non cambia la data o la durata svolta: serve una correzione
  esplicita della sessione. Prima della registrazione si propone la nuova data del piano.
- Correggere la data svolta sposta i minuti fra settimane; restano invariati ID,
  collegamento originale e storico della correzione.
- La durata prevista, modificata dopo la registrazione, non modifica quella svolta.
- Una sessione manuale oltre mezzanotte si attribuisce alla data dichiarata;
  quella collegata propone la data di inizio dell’appuntamento. Niente suddivisione
  automatica: per ripartire i minuti si usano registrazioni esplicite per giornata.
- Giorni e settimane dipendono da date `YYYY-MM-DD`. I timestamp servono all’audit,
  non per reinterpretare la data svolta dopo un cambio di fuso o ora legale.
- La data di riferimento si passa al dominio per consentire prove riproducibili.
  Bloccare nuove registrazioni future, senza rendere invalido uno storico già salvato
  se il dispositivo cambia data/fuso; eventuali sessioni ora future restano separate
  dal progresso maturato fino alla data di riferimento.

### Archiviazione e conservazione

| Azione | Effetto |
| --- | --- |
| Rimuovere un appuntamento o cambiarne la serie | Conservare la sessione svolta e l’identità originale, anche se la fonte non esiste più |
| Rimuovere una sessione | Escluderla dai totali, conservare audit e identità; consentire ripristino senza duplicati |
| Archiviare l’abitudine | Nasconderla dagli obiettivi attivi; conservare diario e target storici |
| Appuntamenti dopo l’archiviazione | Interrompere quelli collegati oltre la data di archiviazione, comprese eccezioni future, nella stessa operazione; lasciare il passato |
| Correggere un’abitudine archiviata | Consentire correzioni e inserimenti entro il periodo attivo, fino alla data di archiviazione inclusa |
| Raggiungere il target | Mostrare «Obiettivo raggiunto», senza interrompere la raccolta dei minuti |
| Svuotare il calendario | Rimuovere gli appuntamenti; conservare definizioni a ore, obiettivi e diario come storico del tempo, spiegandolo nella conferma |
| Ripristinare tutto | Eliminare anche definizioni a ore, target, sessioni e audit, nella transazione di reset |

Nella prima versione le abitudini a ore si archiviano; non si aggiunge una nuova
cancellazione definitiva dedicata. Nessuna conversione implicita fra ore e step.
La conservazione a fronte di «Svuota calendario» è una nuova regola limitata ai
dati a ore: i comportamenti legacy restano invariati e i testi distinguono i casi.

## 5. Modello e contratti

### Identità delle abitudini

Proposta: trasformare `Habit` in un’unione discriminata con base comune
`id`, `title`, `motivation`, `icon`, `color`:

- `StepHabit`: `mode: "steps"` e `stepTarget`, con il comportamento attuale.
- `WeeklyTimeHabit`: `mode: "weekly-time"`, `startsOn`, `archivedOn?` e una sequenza
  di target `{ effectiveFrom, targetMinutes }`.

Il primo target ha decorrenza pari al lunedì della settimana iniziale; la data
`startsOn` delimita comunque le sessioni ammesse. I target successivi hanno lunedì
univoci e sono ordinati. Evitare di duplicare un campo «target attuale»: si deriva
dalla sequenza e dalla settimana selezionata.

I vecchi backup vengono normalizzati in `StepHabit`. Separare `StepHabitDraft` e
`WeeklyTimeHabitDraft`: un form a ore non deve inventare `stepTarget`, giorni o orari
per soddisfare il vecchio contratto.

`CalendarItem.habitId` può collegare entrambi i metodi, senza nuove associazioni per
titolo. Propagare la modalità alle letture per la UI. Gli appuntamenti a ore non
usano `habitClosedOn`/`habitPlannedUntil` e non diventano routine monitorate.

Oggi `isProgressActivity` riconosce qualsiasi `habitId` come attività con esiti:
prima di collegare gli appuntamenti a ore, adeguare questa classificazione usando
l’abitudine risolta o un indice dello snapshot. Distinguere l’idoneità agli esiti
binari dalla visibilità in Oggi; menu, comandi rapidi, validazioni e statistiche
devono usare la classificazione corretta. Non dedurre la modalità dal titolo o
duplicarla come dato persistente non sincronizzato sugli appuntamenti.

### Sessioni e audit

Nuove collezioni nell’archivio:

| Collezione | Dati persistenti |
| --- | --- |
| `timeSessions` | ID stabile, `habitId`, data svolta, minuti, nota, collegamento facoltativo alla coppia originale dell’appuntamento, stato di rimozione |
| `timeSessionHistory` | ID del comando/record, ID sessione, azione, copia dei dati confermati e timestamp; ordine deterministico |

La sessione corrente è la fonte dei totali; lo storico è audit e non viene sommato.
Salvare entrambe le collezioni atomicamente. La chiave univoca del collegamento vale
anche per le sessioni rimosse: registrare nuovamente la stessa occorrenza ripristina
o modifica quella sessione, non crea una seconda identità.

Le sessioni possono sopravvivere alla rimozione della fonte: validare formato e
coerenza dei riferimenti senza imporre un vincolo SQL che elimini il diario in cascata.
Richiedere invece che l’abitudine a ore esista, anche se archiviata.

### API del Provider proposte

- `saveWeeklyTimeHabit(draft)` e `updateWeeklyTimeHabit(id, draft)`.
- `scheduleWeeklyTimeTarget(id, targetMinutes, effectiveFrom)` e annullamento della variazione futura.
- `archiveWeeklyTimeHabit(id, date)` con rimozione atomica del piano successivo.
- `saveTimeSession(command)`, `removeTimeSession(command)` e `restoreTimeSession(command)`.
- `linkTimeSession(command)` per associare una sessione manuale a un’occorrenza esistente.
- `getWeeklyTimeProgress(id, week, referenceDate)` e `getTimeSessions(id, from, through)`.
- `getWeeklyTimeHistory(id, fromWeek, throughWeek, referenceDate)`.

Le firme definitive vanno fissate con i tipi nella prima fase. I comandi portano
ID stabile e valori desiderati; un retry dello stesso comando non aggiunge una
sessione né un secondo record di audit. Disabilitare i doppi invii in UI resta una
protezione aggiuntiva, non l’unico meccanismo contro i duplicati.

Riutilizzare `saveItem` per la pianificazione estendendone soltanto validazioni e
collegamenti necessari. La mutazione dell’archivio rimane nel dominio/Provider,
con revisione attesa e stato pubblicato solo dopo conferma del repository.

## 6. Progresso e statistiche

Le letture derivate rimangono in `StatisticsRepository`, sullo snapshot confermato,
con funzioni pure di supporto nel dominio:

- `completedMinutes`: somma delle sessioni attive della settimana maturate entro
  la data di riferimento.
- `targetMinutes`: obiettivo con la decorrenza più recente non successiva alla settimana.
- `remainingMinutes = max(0, targetMinutes - completedMinutes)`.
- `excessMinutes = max(0, completedMinutes - targetMinutes)`.
- Percentuale effettiva anche oltre 100%; barra visiva limitata al 100%.
- Tempo pianificato mostrato separatamente, senza sommarlo allo svolto. Nell’eventuale
  indicatore «ancora pianificato» contare solo occorrenze future senza sessione attiva,
  mantenendo distinti appuntamenti trascorsi senza registrazione.

Non salvare totali, percentuali, settimane raggiunte o barre nel database.
Non usare `toTime` per visualizzare durate: riporta i valori nel ciclo delle 24 ore.
Se manca una utility adatta, aggiungere `formatDurationMinutes` in `src/utils/time.ts`
con JSDoc ed esempi per zero, ore/minuti e durate superiori a 24 ore.

Il primo storico è una lista di settimane nel dettaglio dell’abitudine: intervallo,
ore effettive, obiettivo valido allora, stato «in corso», «raggiunto» o «terminata
sotto obiettivo». Le settimane prima dell’inizio, dopo l’archiviazione e future
non sono insuccessi. Quelle iniziali/finali parziali sono segnalate; non introdurre
una nuova media di successo che le mescoli alle settimane complete.

Le percentuali giornaliere, la vista Per attività e i trofei esistenti restano basati
sui loro eventi e sulle loro regole. Escludere esplicitamente le sessioni a ore e
i loro appuntamenti da quei calcoli: non convertire minuti in «eventi fatti».
Il nuovo riepilogo settimanale è autonomo; una vista a ore nella sezione Statistiche
può essere un incremento successivo, dopo aver definito la misura da mostrare.

## 7. Persistenza, migrazione e sicurezza

Mantenere il flusso UI → `useDB`/`DBProvider` → `RepositoryDB` → preload → main/worker
→ SQLite. Il bridge corrente già espone lettura/scrittura di snapshot: non occorre
aggiungere canali IPC per ogni comando del Provider.

Proposta rispetto alla baseline verificata: **backup 2→3, SQLite 4→5**. Questi numeri
non sono prenotati: se il piano Routine viene realizzato prima, usare le versioni
successive effettivamente disponibili e una migrazione cumulativa compatibile.
La versione interna di `CalendarState` va valutata separatamente, senza incrementarla
per automatismo.

1. Estendere discriminanti, campi ammessi e validazioni da `unknown`, compresi limiti,
   riferimenti, ordine dei target, unicità delle sessioni e coerenza dell’audit.
2. Aggiungere tabelle per sessioni e audit; le definizioni possono restare nella
   tabella `habits` con dati serializzati. Un indice univoco sulla coppia origine/data
   impedisce due sessioni collegate alla stessa occorrenza; entrambe le colonne sono
   nulle per una sessione manuale o entrambe valorizzate per una collegata.
3. Aggiornare read/write/reset e le costruzioni di archivi vuoti: repository,
   Provider, `DevRepository`, store SQLite e fixture. Oggi più punti fissano `version: 2`.
4. Eseguire la nuova migrazione transazionalmente: conservare ID, ordine dello
   storico, revisione e metadati. Normalizzare anche `previousImport`.
5. Aprire i backup v2 con abitudini `steps` e nuove collezioni vuote. Non inferire
   minuti svolti dalla durata di appuntamenti o da esiti legacy.
6. Per il formato v1, conservare e documentare il comportamento di conversione
   legacy già esistente: non promettere il recupero di dati che quel convertitore
   oggi elimina. Nessuna nuova eliminazione deve essere introdotta dalla migrazione a ore.
7. Export/import deve includere target, sessioni e audit. Le versioni future o
   incoerenti vengono rifiutate prima di sostituire l’archivio; nessun export con
   scarto silenzioso dei dati per simulare un formato precedente.
8. Un errore di conversione, scrittura o revisione produce rollback e messaggio
   locale; non inizializza un database vuoto al posto di quello esistente.

Gli input e il mittente continuano a essere validati nel main; il worker verifica
l’archivio ricevuto. Conservare `contextIsolation: true`, `nodeIntegration: false`,
import `.js` nei moduli Node/Electron e preload `.cts`. Le nuove funzioni condivise
ricevono JSDoc in italiano; nessun accesso a IPC o filesystem dai componenti.

## 8. Fasi di implementazione

| Fase | Lavoro concreto | Criterio di uscita |
| --- | --- | --- |
| A. Contratti e invarianti | Tipi step/ore, target con decorrenza, sessioni/audit, esempi delle regole | Modelli e scenari senza ambiguità; mappa completa dei consumatori degli step |
| B. Dominio e dati | Validazione, correzioni idempotenti, somme, migrazioni, backup | Test su archivi temporanei; vecchi dati conservati e risultati legacy identici |
| C. Repository e Provider | Comandi e letture, revisioni, loading locale, gestione errori | Retry e fallimenti non duplicano sessioni né mostrano dati non salvati |
| D. Creazione e diario | Terza scelta, editor ore, dettaglio settimanale, aggiungi/modifica/rimuovi/ripristina, storico e archiviazione | L’esempio guida funziona end-to-end e sopravvive al riavvio |
| E. Calendario e Oggi | Registrazioni senza orario, riepiloghi, sidebar, pianificazione facoltativa e collegamento | Un solo conteggio fra diario e appuntamento; date originali preservate |
| F. Verifica e documentazione | Scenari completi, browser, palette, accessibilità, aggiornamento guide | Controlli superati e distinzione chiara fra ore, step e routine |

Ordine: **A → B → C → D → E → F**. Ogni fase produce modifiche piccole e verificabili.
Le migrazioni della fase B vengono definite prima di rendere utilizzabile la nuova UI.

Il primo incremento dimostrabile è la fase D: creare un obiettivo di 6 ore, registrare
2 ore con una nota, ritrovarle dopo il riavvio. La consegna completa include anche E
e F; non considerare conclusa la funzione con il solo form o con dati tenuti in memoria.

### Mappa dei file

| Area | File da estendere o introdurre |
| --- | --- |
| Modelli | `src/model/habit.ts`, nuovo `src/model/timeSession.ts`, `calendar.ts`, `outcomeArchive.ts`, `database.ts` |
| Dominio | Nuovi `src/domain/weeklyTimeHabits.ts` e `timeSessions.ts`; adeguamenti mirati in `habits.ts`, `habitCompletion.ts`, `habitTimeline.ts`, `habitDashboard.ts`, `calendar.ts`, `outcomeArchive.ts` |
| Persistenza | `src/repository/RepositoryDB.ts`, `DevRepository.ts`, `electron/sqliteStore.ts`, `storedArchive.ts` |
| Letture e comandi | `src/repository/StatisticsRepository.ts`, `src/providers/DBProvider.tsx`, contratti consumati da `useDB` |
| UI | Editor ore e sessione in `src/screens/habits/`; `HabitsScreen`, componenti di Oggi e sidebar, `AppDialogs`/`AppShell`, schermate e menu del calendario |
| Aspetto | Icone in `src/icons`, stili nelle sezioni pertinenti di `src/styles.css`, limiti statici in `src/constants.ts` |
| Verifiche | Suite di dominio/repository, `tests/sqlite.test.mjs`, fixture browser con `createDevRepository`, runner `scripts/test-calendar.mjs` se necessario |

Il controllo dei consumatori è essenziale: oggi `getHabitCompletionDate`, la
riconciliazione, il dashboard e i dettagli UI assumono `stepTarget` per ogni abitudine.
Restringere i tipi delle funzioni a step invece di aggiungere valori fittizi alla
modalità ore. Non riscrivere le altre parti dell’app come prerequisito.

## 9. Scenari di accettazione

1. Creare un’abitudine a ore senza appuntamenti riesce; quella a step mantiene
   validazione, pianificazione e chiusura precedenti.
2. Registrare 120 + 90 + 60 minuti mostra 270/360, ossia 4 h 30 min / 6 h e 1 h 30 min
   mancanti, in dettaglio, riepilogo e calendario.
3. Aggiungere due ore pianificate non cambia quei 270 minuti; registrare 90 minuti
   per l’appuntamento porta a 360 senza contare anche la durata prevista.
4. Registrare 420/360 mostra 7/6 ore e obiettivo raggiunto; la barra non supera il
   proprio contenitore e l’abitudine resta attiva.
5. Doppio invio o retry dello stesso comando produce una sola sessione e un solo
   record di audit per quel comando. La seconda sessione manuale esplicita resta ammessa.
6. Modificare una sessione da 120 a 60 minuti diminuisce il totale di 60; rimozione
   e ripristino sottraggono/ripristinano esattamente quel contributo.
7. Collegare una sessione manuale già conteggiata non cambia i minuti; una seconda
   sessione sulla stessa coppia originale viene rifiutata o apre quella esistente.
8. Spostare domenica su lunedì prima della registrazione propone lunedì; dopo la
   registrazione lascia intatti i minuti della domenica finché non si corregge la sessione.
9. Cambiare ricorrenza, eliminare un appuntamento o svuotare il calendario conserva
   il diario a ore e i suoi riferimenti storici; non modifica i risultati legacy.
10. Cambiare target da 6 a 8 ore domenica modifica solo le settimane da lunedì;
    settimana corrente e precedenti restano valutate con 6 ore.
11. La prima settimana iniziata di mercoledì è dichiarata parziale; il lunedì
    successivo riparte senza debiti e senza duplicare o cancellare sessioni.
12. Cambio anno, 29 febbraio e ora legale rispettano le settimane civili. Testare
    anche estremi delle date ammesse e rifiutare intervalli fuori dai limiti.
13. Rifiutare zero, negativi, frazioni di minuto, `NaN`, valori fuori limite e date
    inesistenti; consentire solo la pianificazione su una data futura.
14. Due abitudini con lo stesso titolo mantengono obiettivi e sessioni separati.
15. Archiviare conserva lo storico, interrompe il piano successivo e rimuove il
    riepilogo attivo; permette una correzione riferita al periodo attivo.
16. Migrazione v2, export/import, copia precedente e reset includono tutte le nuove
    collezioni. Un errore simulato lascia intatto lo snapshot precedente.
17. Chiudere e riaprire ritrova sessioni, note, variazioni future e rimozioni confermate.
18. Con gli stessi dati legacy, percentuali giornaliere, Per attività, serie concluse
    e trofei danno gli stessi risultati prima e dopo l’introduzione delle ore.
19. Gli errori sono locali, i campi non si perdono e la UI non blocca l’intera app
    per ogni registrazione. Tutte le azioni si usano senza hover o trascinamento.

### Verifiche di consegna

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- `/tests/database.browser.html` per gli interventi a Provider e inizializzazione,
  più una fixture dedicata ai percorsi a ore con repository in memoria.
- SQLite esclusivamente su file temporanei; mai sul database personale.
- Browser a 320/390/430 px e desktop, palette disponibili, testo ingrandito,
  navigazione da tastiera, focus dei dialoghi e preferenza di movimento ridotto.
- Prova manuale Electron su profilo temporaneo per riavvio e backup end-to-end.
- Test di scenari e invarianti: nessun test che replichi soltanto il markup o la
  somma scritta nell’implementazione senza verificare un comportamento significativo.

## 10. Aggiornamento della documentazione

Questo piano rimane una proposta finché le fasi non sono consegnate. A implementazione
conclusa aggiornare `calendario-continuo.md` per i flussi utente,
`provider-database-model.md` per contratti e persistenza, `stato-progetto.md` per
funzioni realmente disponibili e `README.md` per la sintesi. Mantenere le nuove
misure a minuti distinte dalle formule esistenti e coordinare le migrazioni con
il piano Routine, senza far dipendere questa funzione dalla sua realizzazione.
