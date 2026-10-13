# Time Planner — Calendario locale

App desktop locale basata su Electron, React, Vite e TypeScript, con SQLite in un
worker. Si apre sulla dashboard della giornata senza richiedere un profilo o un piano.
Nessun account, backend proprietario o sincronizzazione.

## Documentazione

Partire dall’[indice della documentazione](docs/README.md): distingue comportamento
attuale, direzione di prodotto e materiale del prototipo storico.

- [Calendario, ricorrenze ed esiti](docs/calendario-continuo.md).
- [Abitudini con obiettivo di ore settimanali](docs/abitudini-ore.md).
- [Architettura, Provider, persistenza e statistiche](docs/provider-database-model.md).
- [Qualità del codice e verifiche](docs/code-quality.md).
- [Stato del progetto e lavoro ancora aperto](docs/stato-progetto.md).

## Avvio

```bash
npm install
npm run dev
```

Usare una versione di Node compatibile con il lockfile e con `node:sqlite`, usato
anche dai test. Le note sull’ambiente verificato sono in [Qualità del codice](docs/code-quality.md).

`npm run dev` avvia Vite, la compilazione Electron in watch e la finestra desktop.
Vite compila React; TypeScript compila main, worker e `electron/preload.cts`
(il preload generato è `preload.cjs`).

La persistenza richiede Electron: il solo server Vite non espone il bridge SQLite.
Le [procedure di verifica](docs/code-quality.md#procedure-di-verifica) includono
le prove browser con dati temporanei. Dopo modifiche a main/preload riavviare Electron.

## Funzionalità attuali

- Dashboard “Oggi” con prossimo passo, timeline e registrazione rapida degli esiti.
- Abitudini con piano settimanale a giorni e orario definiti, collegate al calendario
  e accompagnate da una timeline del percorso recente.
- Calendario settimanale con creazione, modifica, spostamento da editor ed eliminazione.
- Impegni fissi e tempo protetto con sblocco esplicito; conflitti rifiutati.
- Ricorrenze settimanali, selezione di più giorni ed eccezioni per singola occorrenza.
- Esiti superato, non superato e parziale, con storico delle correzioni.
- Panoramica annuale con statistiche giornaliere e vista “Per attività”.
- Profilo e obiettivi facoltativi, colori, icone, copertine e palette.
- SQLite locale e import/export JSON.
- Svuotamento del calendario con conferma, conservando storico, profilo e obiettivi.

## Struttura

- `src/components/`, `src/App.tsx`: presentazione e interazioni.
- `src/providers/`, `src/hooks/`: operazioni applicative, stato condiviso e loading.
- `src/repository/`: persistenza e statistiche derivate.
- `src/domain/`, `src/model/`, `src/utils/`: regole, tipi condivisi e utility pure.
- `electron/`: main, preload, servizio database e worker SQLite.
- `tests/`: test automatici e suite browser su dati di prova.
- `ai-lab/`: dati e strumenti sperimentali per valutazioni AI offline.

## Verifiche e build

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

La build produce `dist/` e `dist-electron/`; non crea un installer desktop.
Per copertura e procedure complete vedere [Qualità del codice](docs/code-quality.md#procedure-di-verifica).

## AI locale

Il vecchio planner settimanale e la relativa UI sono stati rimossi. Non serve un modello
per usare l’app; il runtime LLM sperimentale resta scollegato dal calendario. Installazione,
download, variabili d’ambiente e adapter sono documentati nel
[runtime AI](docs/architettura-distribuzione-ai.md). Per training e valutazione offline
vedere [AI Lab](ai-lab/README.md).
