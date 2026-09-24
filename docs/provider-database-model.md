# Provider, repository e modelli

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

- `src/model/`: definizioni TypeScript condivise, contratti delle operazioni e props dei componenti. I modelli del calendario sono in `calendar.ts`, archivio e storico in `outcomeArchive.ts`, contratti di persistenza in `database.ts`, loading in `loading.ts`. I vecchi moduli possono riesportare i tipi per compatibilità; le definizioni sono qui.
- `src/domain/`: funzioni pure e regole del calendario, validazione, ricorrenze, vincoli e backup.
- `src/providers/LoadingProvider.tsx`: operazioni in corso, conteggio delle richieste simultanee, overlay bloccante e stato consultabile per singola operazione.
- `src/providers/DBProvider.tsx`: stato condiviso, operazioni applicative, errori, loading e aggiornamento della UI solo dopo la conferma del salvataggio.
- `src/repository/RepositoryDB.ts`: unico accesso del Provider alla persistenza. Espone Promise e nasconde il trasporto Electron. Legge il precedente archivio solo quando SQLite non è ancora inizializzato.
- `electron/databaseService.ts`: inoltra le richieste al worker senza bloccare il processo principale.
- `electron/sqliteStore.ts`: schema SQL, validazione, transazioni e controllo della revisione. Le operazioni SQLite sincrone vengono eseguite esclusivamente nel worker.

I componenti non importano il repository, non accedono a SQLite/IndexedDB e non chiamano `window.plannerDB`. Usano `useDB()` oppure callback applicative ricevute dal componente padre. Il tema resta una preferenza del dispositivo, accessibile tramite Provider e repository.

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

## SQLite e migrazione

Il file `agenda.sqlite` si trova nella directory `app.getPath("userData")` di Electron. Le tabelle sono `activities`, `goals`, `outcome_records` e `metadata`. Gli esiti hanno colonne per data dell’appuntamento, identità dell’occorrenza e momento della registrazione, con indici per data e occorrenza.

Alla prima apertura il repository recupera, in ordine, l’archivio IndexedDB esistente oppure il vecchio calendario localStorage. Copia dati, storico e backup precedente in una transazione SQLite; non cancella né modifica gli archivi di origine. Le successive aperture usano SQLite. Un archivio precedente non valido blocca la migrazione, evitando una sostituzione silenziosa con dati vuoti.

Il backup JSON resta importabile/esportabile. Ogni importazione sostituisce i dati e conserva una copia del precedente archivio. Gli esiti rimangono nello storico dopo l’eliminazione delle attività; le statistiche contano l’ultimo esito per appuntamento.

La persistenza reale richiede Electron (`npm run dev`); il solo server Vite non espone il collegamento al database. Dopo modifiche a main/preload è necessario riavviare Electron.

## Verifiche

- `npm run typecheck`: controllo dei tipi React ed Electron.
- `npm test`: test del dominio e del database SQLite, inclusi riapertura, transazioni fallite, revisioni concorrenti, backup e worker asincrono.
- Con Vite attivo, `/tests/database.browser.html`: test dei Provider, loading, errori e migrazione su archivi temporanei. La UI dimostrativa usa un repository in memoria: non modifica i dati dell’utente.
- `npm run build`: compilazione renderer e processo Electron.

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

I modelli sono in `src/model/weeklyStatistics.ts`; i test delle regole in `tests/weekly-statistics.test.cjs`.

## Statistiche giornaliere

`useDB().getDailyStatistics("2026-09-23")` espone il nuovo metodo del middleware. Restituisce totale pianificato, conteggi per esito, `recorded`, `completionPercent` e segmenti `activities` con titolo, icona, colore, numero di appuntamenti, `completed` e `contributionPercent`. I modelli sono in `src/model/dailyStatistics.ts`.

Il grafico giornaliero rappresenta la composizione della giornata: conta una volta ogni appuntamento che occupa quella data, comprese le continuazioni dal giorno precedente; una fine a mezzanotte non occupa il giorno successivo. Il completamento è `completed / total * 100`; il contributo di ogni segmento è il numero di appuntamenti superati di quella attività diviso per tutti gli appuntamenti pianificati nella giornata. La quota non completata resta grigia: parziali, non superati e senza esito non valgono come superati. Non si usano pesi basati sulla durata né percentuali arbitrarie per gli esiti parziali. Titoli normalizzati uguali con lo stesso colore e icona condividono un segmento; colori diversi restano distinti.

Le correzioni degli esiti vengono deduplicate per identità dell’occorrenza. Lo storico compare alla data dell’evento salvata, anche dopo l’eliminazione; quando presente nella stessa giornata, l’evento attuale fornisce colore e titolo aggiornati. Un evento spostato può comparire nella nuova giornata come appuntamento attuale e nella vecchia come storico. Per questo la somma dei grafici giornalieri non equivale al totale settimanale degli appuntamenti, che li attribuisce una sola volta alla data di inizio o alla data storica dell’esito.

I risultati sono memorizzati nel middleware fino al successivo aggiornamento del Provider. `DailyDoughnut` usa Chart.js e i colori degli eventi; il calendario mostra un grafico compatto con percentuale centrale solo se `recorded > 0`. Senza esiti mostra i pallini dei colori pianificati, senza grafico né percentuale; senza appuntamenti la cella resta vuota. Il clic sulla giornata apre il dettaglio con legenda dei contributi percentuali ed esiti. I canvas sono inizializzati solo quando visibili.
