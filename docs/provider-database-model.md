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

Il file `agenda.sqlite` si trova nella directory `app.getPath("userData")` di Electron.
Le tabelle sono `activities`, `habits`, `goals`, `outcome_records` e `metadata`. Gli esiti hanno
colonne per data dell’appuntamento, identità dell’occorrenza e momento della registrazione,
con indici per data e occorrenza.

RepositoryDB legge sempre SQLite. Se non esiste ancora uno snapshot, salva un calendario
vuoto con storico vuoto e revisione attesa nulla. Le aperture successive restituiscono
lo snapshot esistente senza riscriverlo. Un errore di lettura o scrittura viene presentato
all’utente: non provoca un ripristino silenzioso. L’importazione accetta esclusivamente backup JSON `time-planner-backup` v1, con calendario v2, abitudini facoltative per compatibilità con i backup precedenti e storico. Campi estranei e formati diversi vengono rifiutati. Gli esiti correnti sono rappresentati soltanto da `outcomes`.

Ogni abitudine possiede un'identità distinta da `activityId`, uno o più piani e gli ID
delle serie settimanali generate. La prima versione crea piani con giorni e orario
definiti. Il salvataggio di abitudine e appuntamenti usa la stessa revisione e
transazione; un conflitto lascia invariato l'intero snapshot. I progressi della vista
Abitudini sono derivati dalle occasioni e dagli esiti confermati.

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

## Statistiche settimanali per attività

`StatisticsRepository` è il middleware di lettura tra l’archivio già caricato dal database e il DBProvider. Non esegue una seconda lettura SQLite durante il rendering e non salva totali derivati. Il Provider lo ricrea quando cambia l’archivio confermato dal repository: salvataggi, importazioni ed eliminazioni aggiornano così le statistiche.

La UI usa esclusivamente il Provider:

```tsx
const { getWeeklyStatistics, getWeeklyActivities } = useDB();
const statistics = getWeeklyStatistics(evento, "2026-09-23");
const cards = getWeeklyActivities("2026-09-23");
```

La data è una data civile `YYYY-MM-DD`. La settimana va dal lunedì alla domenica inclusi. Il risultato contiene intervallo, sette riepiloghi giornalieri, totale appuntamenti, superati (`completed`), non superati (`skipped`), parziali, senza esito (`pending`), numero di esiti registrati e percentuale di superati sugli esiti registrati (`null` se non ci sono esiti). Gli appuntamenti senza esito non vengono considerati falliti.

Il raggruppamento mantiene una card per attività con identità condivisa o titolo normalizzato, come nella barra laterale. L’ultimo esito per identità dell’occorrenza prevale sulle registrazioni precedenti. Si usa la data dell’appuntamento salvata nell’esito, non il giorno in cui viene premuto il pulsante; i dati storici restano validi anche dopo l’eliminazione dell’appuntamento. Gli appuntamenti notturni vengono contati una sola volta nel giorno di inizio. Le card mostrano le attività attualmente presenti nel calendario; le settimane senza appuntamenti mostrano zero.

I modelli sono in `src/model/statistics.ts`; i test delle regole in `tests/weekly-statistics.test.cjs`.

## Statistiche giornaliere

`useDB().getDailyStatistics("2026-09-23")` espone il nuovo metodo del middleware. Restituisce totale pianificato, conteggi per esito, `recorded`, `completionPercent` e segmenti `activities` con titolo, icona, colore, numero di appuntamenti, `completed` e `contributionPercent`. I modelli sono in `src/model/statistics.ts`.

Il grafico giornaliero rappresenta la composizione della giornata: conta una volta ogni appuntamento che occupa quella data, comprese le continuazioni dal giorno precedente; una fine a mezzanotte non occupa il giorno successivo. Il completamento è `completed / total * 100`; il contributo di ogni segmento è il numero di appuntamenti superati di quella attività diviso per tutti gli appuntamenti pianificati nella giornata. La quota non completata resta grigia: parziali, non superati e senza esito non valgono come superati. Non si usano pesi basati sulla durata né percentuali arbitrarie per gli esiti parziali. Titoli normalizzati uguali con lo stesso colore e icona condividono un segmento; colori diversi restano distinti.

Le correzioni degli esiti vengono deduplicate per identità dell’occorrenza. Lo storico compare alla data dell’evento salvata, anche dopo l’eliminazione; quando presente nella stessa giornata, l’evento attuale fornisce colore e titolo aggiornati. Un evento spostato può comparire nella nuova giornata come appuntamento attuale e nella vecchia come storico. Per questo la somma dei grafici giornalieri non equivale al totale settimanale degli appuntamenti, che li attribuisce una sola volta alla data di inizio o alla data storica dell’esito.

I risultati sono memorizzati nel middleware fino al successivo aggiornamento del Provider. `DailyDoughnut` usa Chart.js e i colori degli eventi; il calendario mostra un grafico compatto con percentuale centrale solo se `recorded > 0`. Senza esiti mostra i pallini dei colori pianificati, senza grafico né percentuale; senza appuntamenti la cella resta vuota. Il clic sulla giornata apre il dettaglio con legenda dei contributi percentuali ed esiti. I canvas sono inizializzati solo quando visibili.

## Vista per attività

La vista interna “Per attività” usa `getStatisticsActivities()` e `getActivityYearStatistics(id, year, referenceDate?)` tramite DBProvider. Mostra una voce per gruppo di attività, includendo le attività eliminate presenti nello storico. Le regole di identità e attribuzione alla data salvata seguono le statistiche settimanali; un appuntamento notturno conta nel giorno di inizio.

Solo in questa vista un esito parziale vale 50%. La media include tutte le occorrenze pianificate nel giorno: superata = 1, parziale = 0,5, non superata o senza esito = 0. Senza alcun esito la cella resta neutra; senza appuntamenti resta vuota. Le date future mostrano il tratteggio, mai una percentuale. Le correzioni sono deduplicate prima del filtro per anno. La panoramica giornaliera conserva la sua formula basata solo sulle attività superate.
