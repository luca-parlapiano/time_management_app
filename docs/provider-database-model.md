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
