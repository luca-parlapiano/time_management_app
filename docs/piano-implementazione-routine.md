# Piano di implementazione: routine su desktop, Android e iOS

> Proposta del 9 ottobre 2026. Questo documento definisce lavoro da realizzare;
> non dichiara funzionalità già disponibili. La richiesta corrente riguarda il piano,
> non l’implementazione o la pubblicazione. Destinazioni confermate: app desktop
> e app Android/iOS distribuite tramite gli store.

## 1. Obiettivo e confini

Una routine è una sequenza personale riutilizzabile, collocata nel calendario e
consultabile mentre si svolgono le azioni. Il valore da verificare è poter preparare
una sequenza una volta, ritrovarla quando serve e adattarla al tempo disponibile.
La progettazione parte dal cellulare; desktop e mobile consentono entrambi creazione,
modifica, pianificazione ed esecuzione.

Le nuove routine restano nel Calendario, senza comparire nella dashboard Oggi,
contribuire alle Statistiche o generare trofei. Le spunte sono un aiuto operativo
per la singola esecuzione, distinto dagli esiti delle abitudini. Le formule e le
regole di completamento delle abitudini restano quelle esistenti.

Non serve una nuova sezione principale. Una card del Calendario apre la routine;
la creazione e la scelta delle sequenze salvate sono raggiungibili dal Calendario.
Un appuntamento senza azioni interne rimane un appuntamento, anche se ricorrente.

### Esempio guida

Routine «Chiudo la giornata», ogni sera alle 22:00:

| Azione | Con calma | Ho poco tempo |
| --- | ---: | ---: |
| Riordino il mio spazio | 5 min | 3 min |
| Preparo il necessario per domani | 5 min | 4 min |
| Leggo qualche pagina | 20 min | 8 min |
| Durata complessiva, calcolata | 30 min | 15 min |

La scelta «Ho poco tempo» per venerdì 9 ottobre modifica solo quell’occorrenza:
22:00–22:15. Sabato mantiene 22:00–22:30. Queste durate sono configurate dall’utente;
il sistema non deve inventare quanto comprimere un’azione.

### Ambito della prima versione

- Sequenza ordinata con titolo, aspetto e durata prevista delle azioni.
- Versione standard e, facoltativamente, versione breve con le stesse azioni.
- Pianificazione singola o settimanale, usando il calendario esistente.
- Avvio, spunte reversibili, uscita e ripresa dopo chiusura dell’app.
- Adattamento della singola occorrenza prima dell’avvio, con verifica dei conflitti.
- Persistenza locale, backup e ripristino su ogni piattaforma.

Timer, voce, notifiche, esecuzione automatica, AI, sequenze annidate e collegamenti
che completano automaticamente un’abitudine sono fuori dalla prima versione.
Non si misura il tempo effettivamente impiegato e non si introduce una penalità per
le azioni non spuntate.

## 2. Punto di partenza verificato

| Area | Codice attuale | Implicazione |
| --- | --- | --- |
| Interfaccia | React e TypeScript | Riutilizzare dominio e componenti adattabili |
| Desktop | Electron, preload, main e worker SQLite | Mantenere il percorso di persistenza e l’isolamento |
| Accesso ai dati | `useDB` → `DBProvider` → `DBRepository`/`RepositoryDB` | Iniettare un repository mobile senza accessi nativi nei componenti |
| Calendario | Serie settimanali, eccezioni, controllo conflitti | Collegare le nuove routine alle occorrenze esistenti |
| Identità | `sourceId` e `occurrenceDate` originale | Conservare le spunte quando un appuntamento viene spostato |
| Routine attuali | Flag opzionale `routine: true` su una serie flessibile | Non riutilizzarlo per rappresentare una sequenza |
| Archivio | Backup versione 2, SQLite `user_version = 4` | Progettare migrazione e conversione prima della UI |
| Client mobile | Non presente nell’attuale configurazione del progetto | Serve un client installabile con storage nativo, non soltanto CSS responsive |

**Precisazione sulle routine attuali:** il codice distingue serie monitorate e
semplici appuntamenti. `isProgressActivity` include le serie flessibili con
`routine: true` in esiti, Oggi e statistiche; gli appuntamenti non monitorati ne
restano esclusi. L’utente ha descritto due eventi visibili solo nel Calendario;
la loro configurazione non è stata ispezionata sul database personale.
La nuova funzione non deve reinterpretare o convertire automaticamente nessuno
dei due casi. Questa distinzione risolve l’ambiguità fra i documenti precedenti.

## 3. Esperienza e interazioni

### Creare e pianificare

1. Dal Calendario si sceglie «Appuntamento» oppure «Routine con azioni».
2. Per una routine si sceglie una sequenza salvata o se ne crea una nuova.
3. L’editor raccoglie titolo, azioni ordinate, durate e variante breve facoltativa.
4. Si scelgono data iniziale, ora, giorni e fine della ricorrenza facoltativa.
5. Il dominio calcola l’orario finale e verifica tutte le collisioni secondo le
   regole del calendario. Definizione e piano vengono salvati insieme.

Una sequenza può essere salvata anche senza appuntamenti. La scelta delle sequenze
è un elenco interno al flusso del Calendario, non una nuova scheda di navigazione.
Nessun doppio flusso «Routine» con significati diversi: il vecchio accesso di creazione
va presentato come «Appuntamento ricorrente». L’opzione di monitoraggio già presente
resta disponibile e comprensibile nell’editor dei dati esistenti, senza conversioni
silenziose o cambiamenti delle statistiche.

### Aprire ed eseguire

- La card mostra titolo, orario e indicazione discreta «3 azioni».
- Il dettaglio mostra tutte le azioni e la scelta fra versione standard e breve,
  se configurata. Le durate sono previsioni, non conto alla rovescia.
- «Inizia» crea o recupera la sessione della stessa occorrenza. Due tocchi o due
  riaperture non creano sessioni duplicate.
- Dopo l’avvio, ogni azione può essere spuntata o deselezionata. La prima non
  spuntata viene evidenziata come prossimo passo; l’ordine non è obbligatorio.
- Uscire dalla schermata non azzera la sessione. La card propone «Riprendi».
- Quando tutte le azioni sono spuntate, mostrare «Sequenza terminata». Togliere una
  spunta rende nuovamente disponibile «Riprendi»; non cambia alcuna abitudine.
- Una sessione parziale può restare tale: nessun completamento automatico a
  mezzanotte e nessun esito «Non fatto». È consultabile dalla sua data nel calendario.
- Avvio dalla data dell’occorrenza o successivamente; sulle date future si pianifica
  e si modifica, senza avviare un’esecuzione fittizia.

### Differenze di presentazione

| Desktop | Cellulare |
| --- | --- |
| Dettaglio ampio con sequenza e piano affiancati | Dettaglio a pagina intera, una colonna |
| Modifica rapida di ordine e durate | Stesse modifiche con controlli touch e tastiera adatta |
| Mouse e tastiera, ordine modificabile anche con pulsanti | Nessuna funzione accessibile solo tramite trascinamento o hover |
| Ritorno al calendario mantenendo settimana e selezione | Indietro ritorna alla giornata e preserva le spunte |
| Conferme di salvataggio vicine al comando | Comando principale raggiungibile, rispettando tastiera e aree sicure |

Validare a 320, 390 e 430 px, tablet e desktop a 1024/1440 px. La vista stretta
dell’attuale app non va considerata già pronta: navigazione, calendario, dialoghi,
importazione e impostazioni richiedono una verifica sull’intero client mobile.

## 4. Regole di dominio e casi limite

| Operazione | Comportamento proposto |
| --- | --- |
| Variante breve | Cambia durate e fine della sola occorrenza, mantenendone l’identità |
| Ritorno alla variante standard | Controlla il nuovo intervallo; in caso di conflitto non salva nulla |
| Cambio dopo l’avvio | Variante e struttura della sessione restano congelate nella prima versione |
| Spostamento di un’occorrenza | Mantiene `sourceId` e data originale; spunte e sessione seguono l’appuntamento |
| Cambio della sequenza | Nuova revisione; sessioni avviate e occorrenze passate conservano la precedente |
| Cambio ricorrenza | Decorrenza esplicita; chiude il vecchio piano e apre il nuovo senza duplicare il giorno di passaggio |
| Occorrenza già spostata oltre la decorrenza | Non duplicarla; migrare la pianificazione preservando la chiave originale o rifiutare l’operazione con spiegazione |
| Rimozione di un’azione | Non elimina l’azione fotografata in una sessione già avviata |
| Eliminazione di un’occorrenza | Nessuna ricomparsa dalla serie; se ha una sessione, conservarla come esecuzione rimossa consultabile nel dettaglio della sequenza |
| Archiviazione della sequenza | Impedisce nuove pianificazioni; non distrugge sessioni o appuntamenti esistenti |
| Cancellazione appuntamenti futuri | Azione esplicita separata dall’archiviazione; lascia consultabili le sessioni precedenti |
| Azzeramento completo dell’app | Elimina anche definizioni e sessioni; «svuota calendario» conserva le sequenze e le sessioni storiche |
| Errore di scrittura | Mantiene l’ultimo stato confermato, mostra errore locale e permette di riprovare |
| Doppio tocco o richiesta ripetuta | Impostare un valore di spunta esplicito, non invertire ciecamente il valore corrente |

Le durate sono interi positivi in minuti. Limiti proposti per la prima versione:
1–20 azioni, durata complessiva massima di 24 ore; confermare questi limiti nella
validazione iniziale. La variante breve non supera la durata standard e non azzera
le durate delle singole azioni. Nessuna somma o percentuale duplicata in persistenza.

Riutilizzare utility civili `YYYY-MM-DD`, calcoli di durata e controllo dei conflitti.
L’orario pianificato resta civile; i timestamp di salvataggio sono istanti. Un cambio
di fuso non deve cambiare la data originale dell’occorrenza. Verificare esplicitamente
routine a cavallo della mezzanotte e passaggi di ora legale.

## 5. Modello dati proposto

Nomi indicativi, da fissare nella prima fase di implementazione.

| Entità | Contenuto persistente | Identità e vincoli |
| --- | --- | --- |
| `RoutineDefinition` | Titolo, aspetto, archivio attivo/archiviato e revisioni della sequenza | `routineId` stabile |
| `RoutineRevision` | Azioni ordinate, durate standard/brevi e numero di revisione | Revisione immutabile; ID stabili delle azioni mantenute |
| Collegamento nel calendario | `routineId` e revisione applicata al piano | Distinto da `habitId` e dal vecchio flag `routine` |
| `RoutineOccurrenceOverride` | Variante scelta per un’occorrenza non ancora avviata | Chiave originale `sourceId` + `occurrenceDate` |
| `RoutineSession` | Snapshot delle azioni e durate scelte, istante di avvio e spunte per ID azione | Una sessione per chiave originale dell’occorrenza |

Le sessioni contengono un titolo/aspetto di riferimento sufficiente a restare leggibili
anche quando il piano è rimosso. Non richiedono una fonte ancora attiva nel calendario.
Il riepilogo «2 di 3», la durata totale e lo stato terminato sono derivati, non contatori
salvati. Le spunte non producono `OutcomeRecord` e non usano `ItemOutcome`.

Il piano conserva la revisione a cui si riferisce. Per applicare una nuova sequenza
agli appuntamenti futuri si usa una decorrenza e un’operazione atomica di cambio piano;
non basta sovrascrivere la definizione corrente. Sessioni già avviate, anche oltre la
decorrenza per un recupero o un vecchio import, restano associate al loro snapshot.

Estendere `PlannerArchive` con definizioni, adattamenti e sessioni. Una nuova
occorrenza di routine non può avere contemporaneamente `habitId`, il flag legacy
`routine: true` o esiti di abitudine. Un controllo condiviso esclude esplicitamente
queste sequenze da `isProgressActivity` e dai relativi percorsi derivati.

## 6. Persistenza, compatibilità e salvataggi

Percorso desktop invariato:

`UI → useDB/DBProvider → RepositoryDB → preload → main → worker → SQLite`

Operazioni proposte sul Provider: salvare/archiviare una definizione, pianificare una
routine, cambiare piano da una data, adattare un’occorrenza, avviare una sessione e
impostare la spunta di un’azione. Query dedicate restituiscono il dettaglio derivato.
Le regole risiedono in `src/domain`, non negli handler dei componenti.

- Riutilizzare la revisione dello snapshot per rifiutare scritture obsolete.
- Salvare insieme adattamento, orario finale ed eventuale snapshot di avvio.
- Usare caricamento locale o silent per le spunte, con stato «Salvataggio» visibile
  sul controllo. Pubblicare nella UI solo l’esito confermato.
- Serializzare le richieste ravvicinate; un tap su una seconda azione non deve
  andare perso perché il Provider sta salvando la prima. Definire e testare una
  coda dedicata di comandi con valori espliciti e arresto su errore.
- Nessun salvataggio ogni secondo o solo alla chiusura dell’app.
- Validare input `unknown`, riferimenti e limiti in tutti i punti di ingresso.
  Preservare validazione del mittente IPC, `contextIsolation: true` e
  `nodeIntegration: false`; nessun bridge IPC generico.

### Migrazione

Proposta: SQLite 4→5 e backup 2→3, da riconfermare rispetto alla baseline al momento
dello sviluppo. Aggiungere tabelle per definizioni/revisioni, adattamenti e sessioni,
con vincolo univoco sulla chiave della sessione. Migrazione transazionale e rollback
su errore, inclusa la copia `previousImport`.

I vecchi archivi si aprono con collezioni di nuove routine vuote. Titoli, ricorrenze,
flag di monitoraggio, esiti e statistiche legacy rimangono identici. Nessuna migrazione
converte automaticamente un appuntamento in sequenza. Un’eventuale conversione
assistita sarà un lavoro successivo, con anteprima delle conseguenze.

Il backup nuovo include tutto il necessario a ripristinare sessioni e piani. Importare
versioni supportate converte e valida prima della scrittura; versioni future o dati
incoerenti vengono rifiutati senza sostituire l’archivio. L’esportazione in formato
precedente non deve scartare silenziosamente i nuovi dati.

## 7. Client Android/iOS e distribuzione

**Scelta tecnica proposta: verificare Capacitor per riutilizzare React e TypeScript.**
Electron rimane il contenitore desktop. Capacitor supporta l’integrazione in progetti
JavaScript esistenti e un contenitore nativo Android/iOS; l’idoneità al nostro client
va dimostrata con una prova tecnica su entrambi i sistemi. [Documentazione ufficiale](https://capacitorjs.com/docs).

Non è una decisione già approvata né un’affermazione che l’app mobile sia pronta.
Il progetto di implementazione deve prima provare calendario touch, tastiera,
accessibilità, storage e ripresa dopo terminazione. Se emergono limiti bloccanti,
confrontare un’interfaccia nativa alternativa indicando costo di riscrittura e codice
realmente riutilizzabile, prima di procedere con l’integrazione completa.

### Confine fra piattaforme

- `DBRepository` è il contratto condiviso. `DBProvider` riceve l’implementazione
  appropriata dal punto di avvio dell’app.
- Desktop continua a usare `RepositoryDB` con `window.plannerDB` e worker Electron.
- Mobile implementa il medesimo contratto sopra SQLite nativo tramite un adattatore
  specifico. Nessun riferimento a Electron o a `node:sqlite` entra nel bundle mobile.
- Riutilizzare validazioni, conversioni di archivio e regole di dominio. Il driver
  mobile deve garantire transazioni, revisioni e semantica dei backup equivalenti.
- Selezionare il driver/plugin SQLite nella prova tecnica verificandone manutenzione,
  licenza, supporto delle versioni Android/iOS scelte, transazioni, migrazioni e
  comportamento dopo sospensione. Non assumere che sia incluso nel contenitore.
- Importazione/esportazione usa servizi di piattaforma iniettati; i componenti non
  accedono direttamente a filesystem o plugin nativi.
- Le dipendenze native sono motivate dal client richiesto, introdotte solo nella
  fase mobile e mantenute fuori dal percorso desktop quando non necessarie.

### Preparazione degli store

Prevedere progetti Android/iOS, identificativi applicazione, icone e splash screen,
configurazioni di firma e build release. Preparare build di prova per tester, poi
schede store, immagini reali, informazioni privacy e canali di supporto coerenti
con le funzioni effettivamente incluse. Verificare i requisiti correnti degli store
al momento della release, senza fissare oggi numeri di SDK o scadenze.

La documentazione di Capacitor descrive la distribuzione tramite i normali flussi
nativi di [Google Play](https://capacitorjs.com/docs/android/deploying-to-google-play)
e [App Store](https://capacitorjs.com/docs/ios/deploying-to-app-store).
Account sviluppatore, identificativi, firme e materiali store sono dipendenze della
release; eventuali costi, accordi e invio pubblico restano azioni separate dal piano.
Non promettere date di approvazione degli store.

## 8. Offline e continuità fra dispositivi

**Stessa funzione sui due dispositivi non significa dati sincronizzati.** Il mockup
condivideva lo stato solo dentro l’anteprima. La revisione SQLite attuale coordina
una singola installazione e non risolve modifiche concorrenti di dispositivi offline.

Primo incremento tecnico: routine utilizzabili offline su ciascun dispositivo,
con backup compatibile. Un’importazione manuale sostituisce l’archivio secondo il
flusso di backup e non deve essere presentata come sincronizzazione o fusione dei dati.

La promessa «preparo sul desktop e riprendo sul telefono» richiede una fase dedicata,
prima di essere comunicata come disponibile:

1. Scegliere identità utente, servizio remoto, autenticazione e politiche dei dati.
2. Definire operazioni con ID univoco, origine dispositivo e idempotenza, coda locale
   e riconciliazione; non usare il solo orologio del dispositivo per decidere il vincitore.
3. Fondere spunte di azioni diverse; per cambi discordanti sulla stessa azione
   definire un ordine causale e una risoluzione visibile, senza perdita silenziosa.
4. Rendere unica la sessione per occorrenza anche dopo due avvii offline concorrenti.
5. Trattare i conflitti di piano e le cancellazioni con record di rimozione; rieseguire
   i controlli di calendario prima di applicare una pianificazione remota.
6. Sincronizzare insieme definizioni, revisioni, calendario e sessioni con i riferimenti
   necessari. La sola copia delle spunte non garantisce continuità.
7. Testare riavvio, retry, duplicati, cambio ordine dei messaggi e dispositivi offline.

Scelta aperta prima della release pubblica: includere questa fase nel primo rilascio
oppure pubblicare una versione dichiaratamente locale per dispositivo. Il piano
non autorizza la creazione di backend, account o servizi a pagamento.

## 9. Fasi di consegna e dipendenze

| Fase | Lavoro concreto | Criterio di uscita |
| --- | --- | --- |
| A. Contratti e prova mobile | Fissare invarianti e nomenclatura; provare contenitore Android/iOS, calendario e SQLite temporaneo | Apertura, scrittura, chiusura forzata e rilettura su entrambi; decisione tecnica motivata |
| B. Dominio e archivio | Tipi, validazioni, sessioni, varianti, revisioni e migrazioni | Test di identità, atomicità, compatibilità e round-trip backup superati |
| C. Repository e Provider | Comandi, letture derivate, coda spunte e adattatori | Stesso comportamento di persistenza in desktop e mobile; errori presentabili |
| D. Editor e Calendario | Sequenze salvate, piano settimanale, varianti, dettagli e accessi coerenti | Creazione e modifica completa su telefono e desktop senza duplicare eventi |
| E. Esecuzione | Avvio idempotente, spunte, ripresa e conservazione delle sessioni | Chiudere e riaprire ritrova esattamente lo stato confermato |
| F. Validazione dispositivi | Accessibilità, calendario, import/export e prestazioni su hardware reale | Scenari di accettazione completati su Android, iOS e desktop |
| G. Continuità, se inclusa nella release | Protocollo, servizio e risoluzione conflitti definiti nella sezione 8 | Passaggio desktop→telefono verificato anche dopo modifiche offline |
| H. Distribuzione | Build firmate, canali di test, materiali e preparazione store | Pacchetti e schede pronti per l’invio; pubblicazione come azione separata |

Ordine: A → B → C → D → E → F → H. La fase G si inserisce prima di H se la release
promette continuità fra dispositivi. La prova mobile è iniziale per evitare di
scoprire limiti di persistenza quando la UI è già completata.

Non stimare giorni prima della fase A: oggi restano da validare driver mobile,
ampiezza dell’adattamento del client e ambito della sincronizzazione. A fine A,
produrre una stima per fase con dipendenze esterne e rischi espliciti.

### Mappa dei file

| Area | File esistenti da estendere / file proposti |
| --- | --- |
| Modello e archivio | `src/model/routine.ts` nuovo; `calendar.ts`, `database.ts`, `outcomeArchive.ts` |
| Regole pure | `src/domain/routines.ts` nuovo; integrazione in `calendar.ts` e `outcomeArchive.ts` |
| Persistenza | `src/repository/RepositoryDB.ts`, adattatore mobile nuovo, `electron/sqliteStore.ts`, `electron/storedArchive.ts` |
| Sicurezza e bridge | `electron/main.ts`, `preload.cts`, `databaseService.ts`, `databaseWorker.ts` solo per gli adeguamenti necessari ai contratti |
| Provider | `src/providers/DBProvider.tsx`; estrarre logica di routine in funzioni di dominio senza rifare gli altri flussi |
| UI | `src/screens/routines/` nuovo; dialoghi, editor e card del Calendario; icone in `src/icons`, stili nelle sezioni pertinenti |
| Mobile | Punto di avvio con repository iniettato, configurazione contenitore e progetti nativi dopo la prova tecnica |
| Verifiche | Test di dominio/repository, `tests/sqlite.test.mjs`, fixture browser routine e contratti adattatore mobile |

## 10. Accettazione e verifiche

La funzione è pronta quando questi scenari passano su dati temporanei:

1. Creare l’esempio da 30 minuti su più giorni genera una sola card per occorrenza.
2. Selezionare la variante breve venerdì cambia solo il venerdì; sabato resta standard.
3. Tornare alla variante lunga in conflitto lascia invariati orario e sessione.
4. Avviare due volte la stessa occorrenza restituisce una sola sessione.
5. Spuntare due azioni rapidamente, chiudere e riaprire conserva entrambe; un errore
   mostra quale comando non è stato salvato e non dichiara completamenti inesistenti.
6. Modificare una spunta non cambia esiti, percentuali, archivio abitudini o trofei.
7. Le nuove sequenze non compaiono in Oggi né nelle Statistiche, anche se flessibili.
   Le serie legacy monitorate mantengono esattamente i risultati precedenti.
8. Spostare un’occorrenza mantiene sessione e identità originali senza duplicati.
9. Cambiare piano o sequenza da una data conserva passato, eccezioni e sessioni
   avviate; nessun doppione al confine fra vecchio e nuovo piano.
10. Domani inizia senza le spunte di oggi; la sessione parziale di ieri resta consultabile.
11. Eliminare un’occorrenza o archiviare una definizione applica le regole dichiarate,
    senza cancellazioni implicite dello storico.
12. Migrazione, export/import e annullamento dell’import conservano vecchi e nuovi dati;
    errore di migrazione/import produce rollback e non un archivio vuoto.
13. Date bisestili, ora legale, cambio fuso e mezzanotte preservano la data originale;
    durate e conflitti seguono le utility civili condivise.
14. Android e iOS funzionano offline e dopo sospensione/terminazione; le operazioni
    su file passano dai servizi della piattaforma e non dal bridge Electron.
15. Tastiera, screen reader, testo ingrandito, schermi stretti e orientamento non
    nascondono comandi o errori; riordinamento utilizzabile senza trascinamento.
16. Se inclusa, la sincronizzazione supera avvii concorrenti, spunte discordanti,
    cancellazioni e cambio piano offline senza perdite silenziose.

Comandi desktop: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
Per i Provider: `/tests/database.browser.html` e suite dedicata alle routine con
repository in memoria. SQLite sempre su file temporanei. Aggiungere una suite di
contratto eseguita contro entrambi gli adattatori e build/test nativi Android/iOS.

La validazione mobile include almeno un dispositivo reale per piattaforma, non solo
ridimensionamento del browser. Misurare la latenza delle spunte su archivi di prova
rappresentativi: lo snapshot completo viene attualmente riscritto a ogni salvataggio.
Ottimizzare con operazioni mirate solo se le misure lo richiedono, preservando
revisioni e transazioni; non introdurre un refactoring generale preventivo.

## 11. Decisioni da chiudere all’avvio

Già stabilito: desktop e Android/iOS negli store; priorità all’esperienza mobile;
nuove routine nel calendario senza risultati nelle statistiche; conservazione dei
dati e dei comportamenti esistenti.

Proposte da validare con l’esempio, senza bloccare la progettazione: variante breve
facoltativa, limiti di azioni/durata, terminologia dei flussi legacy e gestione delle
sessioni rimosse. Le versioni breve e standard condividono le azioni nella prima
versione; saltare azioni automaticamente richiederebbe una regola ulteriore.

Decisioni tecniche dopo la prova: contenitore mobile, driver SQLite e versioni minime
supportate. Decisione di rilascio: sincronizzazione inclusa oppure disponibilità
locale esplicita. La pubblicazione richiede anche gli account e materiali store.

## 12. Collegamento con la documentazione esistente

Questo è il riferimento operativo proposto per le nuove routine a sequenza.
Il [piano Oggi e Abitudini](piano-implementazione-oggi-abitudini.md) resta valido per
le abitudini; le sue descrizioni delle routine documentano il modello precedente.
Il [benchmark strategico](strategia-prodotto-e-benchmark.md) offre contesto, non
obbliga a riprodurre interfacce di altre app. Aggiornare lo
[stato del progetto](stato-progetto.md) solo dopo ogni fase realmente consegnata.
