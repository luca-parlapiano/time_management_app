# Architettura, Provider, repository e modelli

> Stato: implementato. Riferimento al codice: 26 settembre 2026.
> [Indice documentazione](README.md) · [Stato del progetto](stato-progetto.md).

## Perimetro e stack

L’app è un calendario desktop locale. L’uso ordinario non richiede account, servizi
remoti, modello AI o generazione iniziale di un piano. Account, backend proprietario,
sincronizzazione, backup remoto, client mobile e smartwatch restano fuori dal perimetro attuale.

- React e TypeScript per il renderer; Vite per sviluppo e build.
- Electron per finestra desktop, preload e accesso alle funzionalità native.
- SQLite tramite `node:sqlite` in un worker asincrono rispetto al main.
- Chart.js per i grafici; statistiche derivate da uno snapshot confermato.

## Flusso applicativo

L’app desktop usa questa struttura:

```text
LoadingProvider
└── DBProvider
    └── App → schermate e componenti

useDB() → DBProvider → RepositoryDB → preload IPC
                                      → Electron DatabaseService
                                      → worker → SQLiteStore → agenda.sqlite
```

## Responsabilità

- `src/model/`: definizioni TypeScript condivise tra più livelli. I modelli del calendario sono in `calendar.ts`, archivio e storico in `outcomeArchive.ts`, statistiche in `statistics.ts`, persistenza in `database.ts` e loading in `loading.ts`. Le props usate da un solo componente restano nel relativo file `.tsx`.
- `src/domain/`: funzioni pure e regole del calendario, validazione, ricorrenze, vincoli e backup.
- `src/providers/LoadingProvider.tsx`: operazioni in corso, conteggio delle richieste simultanee, overlay bloccante e stato consultabile per singola operazione.
- `src/providers/DBProvider.tsx`: stato condiviso, operazioni applicative, errori, loading e aggiornamento della UI solo dopo la conferma del salvataggio.
- `src/repository/RepositoryDB.ts`: unico accesso del Provider alla persistenza. Espone Promise e nasconde il trasporto Electron. Inizializza un archivio vuoto quando SQLite non contiene ancora uno snapshot.
- `electron/databaseService.ts`: inoltra le richieste al worker senza bloccare il processo principale.
- `electron/sqliteStore.ts`: schema SQL, validazione, transazioni e controllo della revisione. Le operazioni SQLite sincrone vengono eseguite esclusivamente nel worker.

I componenti non importano il repository, non accedono a SQLite e non chiamano `window.plannerDB`. Usano `useDB()` oppure callback applicative ricevute dal componente padre. Il tema è una preferenza del dispositivo salvata nella tabella SQLite `metadata`, tramite Provider, repository e worker. Il salvataggio della palette non riscrive il calendario né modifica la sua revisione.

Il preload espone metodi specifici; la finestra mantiene `contextIsolation: true` e
`nodeIntegration: false`. Il main verifica il mittente dei canali database; lo store
valida dati e revisione prima di applicare le scritture nella transazione.

## Operazioni della UI

```tsx
const { recordOutcome, saving } = useDB();

await recordOutcome(occurrence, "completed");
```

Sono disponibili anche `saveItem`, `deleteItem`, `savePreferences`, `clearCalendar`, `prepareImport`, `importBackup` ed `exportBackup`.

Il Provider usa sempre lo stato corrente, impedisce salvataggi concorrenti nella stessa finestra e conserva lo stato visualizzato se una scrittura fallisce. SQLite verifica inoltre la revisione per evitare sovrascritture da altre finestre. Calendario e storico vengono salvati nella stessa transazione.

### Snapshot confermati e completamento delle abitudini

`DBRepository.initialize()`, `save()` e `reset()` restituiscono snapshot validati con
le chiusure delle abitudini ricostruite dagli ultimi esiti. Il contratto comprende
sia `archive` sia l’eventuale copia `previous`. `RepositoryDB` prepara i risultati
del bridge in un unico punto; il Provider li pubblica senza normalizzarli di nuovo.
`StatisticsRepository` e `habitDashboard` ricevono questi dati già preparati e non
ricostruiscono le chiusure del calendario. Anche i repository usati nei test devono
rispettare il contratto: le prove browser usano il repository reale su un bridge
in memoria, senza accedere a Electron o al database dell’utente.

`prepareImport()` restituisce invece un candidato validato, ancora da salvare.
Il controllo preventivo delle modifiche nel Provider resta attivo: una correzione
che riapre una serie deve verificare gli orari nuovamente occupati. SQLite ripete
il controllo nella transazione, confrontando i dati realmente salvati. Questa
verifica protegge anche dalle richieste che non passano dal Provider.

`habitClosedOn` rimane un dato derivato in memoria, escluso da SQLite e dai backup.
La preparazione dello snapshot non modifica gli oggetti ricevuti né riscrive il
database all’apertura.

### Indice condiviso degli esiti

`StatisticsRepository` costruisce un `HabitOutcomeIndex` per ogni snapshot confermato.
L’indice deduplica una volta lo storico per fonte/data originale, poi raggruppa
gli esiti per identità dell’attività e ordina le date dei completamenti. Occorrenze
diverse completate nello stesso giorno restano distinte, come le serie ripetute
con lo stesso titolo. Le correzioni prevalgono prima del filtro temporale.

Oggi, Abitudini/Archivio e sidebar usano `getHabitProgress`, `getHabitCompletionDate`
e `getHabitTimeline` tramite `useDB`; la dashboard e le statistiche riutilizzano
lo stesso indice. Le statistiche escludono ancora le fonti non monitorate, mentre
il percorso dell’abitudine conserva gli esiti delle occasioni rimosse. La dashboard
limita il progresso alla data richiesta; il dettaglio mantiene il progresso totale.
Gli intervalli e l’ora corrente vengono applicati durante la lettura, quindi non
sono congelati nella cache. Il Provider conserva l’indice durante un salvataggio
pendente o fallito e lo sostituisce solo quando cambia l’archivio confermato.

Anche la riconciliazione delle chiusure costruisce un solo indice per archivio,
invece di deduplicare lo storico per ogni abitudine. L’indice resta in memoria:
nessun nuovo campo in SQLite o nei backup, nessuna cache globale fra snapshot.

## Loading configurabile

Da qualsiasi componente o hook discendente dal LoadingProvider:

```tsx
const { run, start, isLoading } = useLoading();

await run(() => operazioneAsincrona(), {
  mode: "local", // "blocking" | "local" | "silent"
  scope: "esportazione",
  message: "Preparazione esportazione…",
});

const busy = isLoading("esportazione");

// Per operazioni controllate manualmente: il rilascio è idempotente.
const finish = start({ mode: "blocking", message: "Caricamento…" });
try {
  await operazioneAsincrona();
} finally {
  finish();
}
```

- `blocking`: dialogo modale con UI sottostante non interagibile. Usato per apertura e importazione.
- `local`: niente overlay; il componente mostra lo stato tramite `isLoading(scope)`. Usato nei salvataggi.
- `silent`: conteggiato in `pending`, senza indicatore visivo.

Ogni operazione ha un identificatore: la prima operazione che termina non nasconde il loading di quelle ancora attive. `run` rilascia sempre il loading in `finally`, anche in caso di errore.

## SQLite e inizializzazione

Il file `agenda.sqlite` si trova nella directory `app.getPath("userData")` di Electron,
fissata alla cartella `time-management-app` anche dopo il cambio del nome visibile in MindMorrow.
Lo schema 5 comprende `activities`, `habits`, `goals`, `outcome_records`, `metadata`,
`weekly_time_habits`, `time_sessions` e `time_session_history`. Gli esiti hanno
colonne per data dell’appuntamento, identità dell’occorrenza e momento della registrazione,
con indici per data e occorrenza.

RepositoryDB legge sempre SQLite. Se non esiste ancora uno snapshot, salva un calendario
vuoto con storico vuoto e revisione attesa nulla. Le aperture successive restituiscono
lo snapshot esistente senza riscriverlo. Un errore di lettura o scrittura viene presentato
all’utente: non provoca un ripristino silenzioso. L’importazione usa backup JSON
`time-planner-backup` v3 con calendario v2, abitudini facoltative, diario delle ore e storico.
I backup v2 vengono aggiornati senza inventare registrazioni di tempo. I backup v1
vengono convertiti eliminando il precedente modello di abitudini e i relativi
appuntamenti; calendario indipendente, profilo, obiettivi e storico restano disponibili.
Campi estranei e formati diversi vengono rifiutati. Gli esiti correnti sono
rappresentati soltanto da `outcomes`.

Ogni abitudine a step conserva soltanto identità, nome, motivazione, aspetto e un
traguardo da 1 a 12 step. Giorni, orario e durata appartengono alle serie del calendario;
`habitId` le collega all'abitudine e `activityId` ne mantiene stabile il percorso nello
storico. Creazione e modifica aggiornano abitudine e appuntamenti nella stessa revisione e
transazione; un conflitto lascia invariato l'intero snapshot. Step e completamento sono
derivati dagli ultimi esiti confermati e non vengono salvati come totali.

Il campo legacy `routine: true` identifica una serie ricorrente monitorata del
calendario. Non viene salvata nella tabella `habits` e non ha `habitId` o step.
Dal 14 ottobre 2026 non è più offerta come nuova scelta: resta leggibile e
modificabile negli archivi esistenti, con esiti e statistiche invariati.

Le [abitudini a ore](abitudini-ore.md) hanno identità e storico dei target separati.
Il diario conserva sessioni correnti e audit, mentre `StatisticsRepository` calcola
totali e registrazioni recenti sullo snapshot confermato. Le loro durate non entrano
nelle statistiche degli esiti binari.

Il backup JSON resta importabile/esportabile. Ogni importazione sostituisce i dati e conserva una copia del precedente archivio. Gli esiti rimangono nello storico dopo l’eliminazione delle attività; le statistiche contano l’ultimo esito per appuntamento.

La persistenza reale richiede Electron (`npm run dev`); il solo server Vite non espone il collegamento al database. Dopo modifiche a main/preload è necessario riavviare Electron.

## Runtime sperimentale

Il planner deterministico settimanale, il simulatore e i relativi servizi renderer
sono stati rimossi. Bridge IPC e runtime `llama-server` esistono ancora per esperimenti
separati dalla UI. Il runtime può usare un server configurato esternamente ed effettuare richieste
di rete. Non è necessario per l’uso ordinario. Vedi [runtime sperimentale AI](architettura-distribuzione-ai.md)
e [limiti aperti](stato-progetto.md).

## Sviluppo e distribuzione

`npm run dev` avvia renderer ed Electron. `npm run build` produce `dist/` e
`dist-electron/`, ma non crea un installer. Non esiste uno script di packaging/installazione
in `package.json`; la build non equivale a una release distribuibile.

Comandi di avvio nel [README](../README.md); convenzioni e criteri di verifica in
[Qualità del codice](code-quality.md).

## Verifiche

Per test di dominio, SQLite/worker, Provider e inizializzazione vedere le
[procedure di verifica](code-quality.md#procedure-di-verifica). I risultati delle
esecuzioni sono nello [stato del progetto](stato-progetto.md#evidenze-di-verifica).

## Lettura delle statistiche

`StatisticsRepository` calcola i dati sull’archivio già caricato dal database. Non esegue una seconda lettura SQLite durante il rendering e non salva totali derivati. Il Provider lo ricrea quando cambia l’archivio confermato dal repository: salvataggi, importazioni ed eliminazioni aggiornano così le statistiche.

La UI usa esclusivamente il Provider:

```tsx
const { getDailyStatistics, getStatisticsActivities, getActivityYearStatistics } = useDB();
const daily = getDailyStatistics("2026-09-23");
const activities = getStatisticsActivities();
const year = activities.length ? getActivityYearStatistics(activities[0].id, 2026, "2026-09-23") : null;
```

Le statistiche includono le abitudini e le attività ricorrenti legacy ancora monitorate. I metodi settimanali, privi di utilizzatori nell’interfaccia, sono stati rimossi. I modelli sono in `src/model/statistics.ts`; i test delle regole in `tests/statistics.test.cjs`.

## Statistiche giornaliere

`useDB().getDailyStatistics("2026-09-23")` espone il riepilogo giornaliero. Restituisce totale pianificato, conteggi per esito, `recorded`, `completionPercent` e segmenti `activities` con titolo, icona, colore, numero di appuntamenti, `completed` e `contributionPercent`. I modelli sono in `src/model/statistics.ts`.

Il grafico giornaliero rappresenta la composizione della giornata: conta una volta ogni appuntamento che occupa quella data, comprese le continuazioni dal giorno precedente; una fine a mezzanotte non occupa il giorno successivo. Il completamento è `completed / total * 100`; il contributo di ogni segmento è il numero di appuntamenti superati di quella attività diviso per tutti gli appuntamenti pianificati nella giornata. La quota non completata resta grigia: non superati e senza esito non valgono come superati. Non si usano pesi basati sulla durata. Titoli normalizzati uguali con lo stesso colore e icona condividono un segmento; colori diversi restano distinti.

Le correzioni degli esiti vengono deduplicate per identità dell’occorrenza. Lo storico compare alla data dell’evento salvata, anche dopo l’eliminazione; quando presente nella stessa giornata, l’evento attuale fornisce colore e titolo aggiornati. Un evento spostato può comparire nella nuova giornata come appuntamento attuale e nella vecchia come storico. Per questo la somma dei grafici giornalieri può differire dai conteggi della vista per attività, che attribuisce ogni occorrenza una sola volta alla data di inizio o alla data storica dell’esito.

I risultati sono memorizzati nel middleware fino al successivo aggiornamento del Provider. `DailyDoughnut` usa Chart.js e i colori degli eventi; il calendario mostra un grafico compatto con percentuale centrale solo se `recorded > 0`. Senza esiti mostra i pallini dei colori pianificati, senza grafico né percentuale; senza appuntamenti la cella resta vuota. Il clic sulla giornata apre il dettaglio con legenda dei contributi percentuali ed esiti. I canvas sono inizializzati solo quando visibili.

## Vista per attività

La vista interna “Per attività” usa `getStatisticsActivities()` e `getActivityYearStatistics(id, year, referenceDate?)` tramite DBProvider. Mostra una voce per gruppo di attività attualmente monitorate, collegando le fonti per identità condivisa o titolo normalizzato, anche transitivamente. L’ultimo esito per identità originale dell’occorrenza prevale e viene attribuito alla data dell’evento salvata nello storico. Un appuntamento notturno conta nel giorno di inizio. Le attività interamente eliminate non sono elencate; il registro degli esiti resta conservato nell’archivio.

La media include tutte le occorrenze pianificate nel giorno: superata = 1, non superata o senza esito = 0. Senza alcun esito la cella resta neutra; senza appuntamenti resta vuota. Le date future mostrano il tratteggio, mai una percentuale. Le correzioni sono deduplicate prima del filtro per anno. La panoramica giornaliera conserva la sua formula basata solo sulle attività superate.
