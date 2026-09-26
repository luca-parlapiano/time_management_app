# Qualità del codice

[Indice documentazione](README.md) · [Stato delle verifiche](stato-progetto.md#evidenze-di-verifica).

La configurazione `eslint.config.mjs` usa ESLint 10 e TypeScript ESLint. È stata verificata con Node 22.16; usare una versione di Node compatibile con gli `engines` delle dipendenze bloccate nel lockfile.

## Comandi

- `npm run lint`: analizza sorgenti, processi Electron, test e script. Anche un warning fa fallire il comando.
- `npm run lint:fix`: applica le correzioni automatiche disponibili; verificare il diff.
- `npm run test:lint`: prova la configurazione con esempi ammessi e vietati; è incluso anche in `npm test`.
- `npm run typecheck`: controlla i tipi del renderer e di Electron.
- `npm test`: esegue test di calendario, archivio, utility, statistiche, inizializzazione del repository, SQLite/worker e configurazione ESLint.
- `npm run build`: compila renderer ed Electron; non crea un installer.

## Procedure di verifica

### Controlli automatici

Dalla radice del progetto, eseguire i controlli pertinenti alla modifica:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

I test usano archivi temporanei e coprono date civili, ricorrenze ed eccezioni, esiti,
statistiche, backup, riapertura, revisioni concorrenti, rollback e worker asincrono.
Il rilevamento dei conflitti viene anche confrontato con un’espansione esaustiva in
100 scenari deterministici. Non usare il database reale dell’utente per le prove.

### Provider e inizializzazione del database nel browser

Questa suite è separata da `npm test`. Avviare `npm run dev:renderer` e aprire
`http://127.0.0.1:5173/tests/database.browser.html` (adattare la porta se Vite ne usa un’altra).
Verifica Provider, loading, errori e inizializzazione del database su archivi temporanei; la UI dimostrativa
usa un repository in memoria. Usarla anche dopo modifiche ai Provider o alla inizializzazione del database.

### Verifica manuale del calendario

Usare un ambiente Electron con archivio di prova separato. Controllare i flussi
interessati dalla modifica:

- creazione senza profilo e navigazione tra settimane;
- ricorrenza su più giorni, spostamento di una sola occorrenza e identità conservata;
- conflitto rifiutato e sblocco esplicito dei vincoli;
- registrazione/correzione degli esiti e aggiornamento delle statistiche;
- riapertura, import/export e annullamento dello svuotamento.

Per modifiche visive controllare anche l’interfaccia nel browser e le dimensioni
interessate. Registrare esiti e limiti delle verifiche nello
[stato del progetto](stato-progetto.md#evidenze-di-verifica), senza confondere una
procedura disponibile con una prova effettivamente eseguita.

## Ambienti

Il renderer dispone delle globali browser. Sono vietati gli import statici Node/Electron, gli import dinamici letterali di quei moduli e le globali Node come `process`, `require` e `Buffer`. Il codice accede alle funzionalità native attraverso il bridge esistente.

Main e worker dispongono delle globali Node. Il linter rileva configurazioni letterali con `nodeIntegration: true` o `contextIsolation: false`. Il preload ha regole di import dedicate: usa Electron e non importa moduli Node aggiuntivi o le principali API del main. Questi controlli non sostituiscono la verifica degli input IPC o una revisione di sicurezza.

Test browser e script/test Node hanno ambienti distinti. `tsconfig.eslint.json` include anche i test TypeScript e il preload per consentire l’analisi delle promesse. Non cambia le configurazioni di compilazione della produzione.

## Regole

Sono attivi i controlli raccomandati JavaScript/TypeScript, import di tipi, simboli inutilizzati, divieto di `any` esplicito, uso degli Hooks e dipendenze degli effetti. Le regole con informazioni sui tipi verificano promesse non attese, promesse usate nel contesto sbagliato e `await` su valori non attendibili come promesse.

Gli handler JSX asincroni restano ammessi per compatibilità con le interazioni esistenti: devono gestire gli errori internamente. `void` può segnalare una promessa intenzionalmente non attesa, ma non intercetta i rifiuti. Non usare queste eccezioni per nascondere errori. Le direttive di disattivazione inutilizzate sono errori.

Le istruzioni permanenti per lavorare nel repository sono in `AGENTS.md`.

## Utility condivise e costanti

Le funzioni in `src/utils/` sono pure, utilizzabili nel renderer e nei processi
Electron, senza dipendenze da React, DOM o database. Prima di aggiungere controlli
numerici, percentuali o conversioni di data/orario, verificare le utility esistenti:

- [numbers.ts](../src/utils/numbers.ts): validazione di numeri e intervalli, senza conversioni implicite.
- [math.ts](../src/utils/math.ts): percentuali, `clamp` e modulo positivo.
- [dates.ts](../src/utils/dates.ts): date civili, validazione e aritmetica delle date; `today` usa la data locale.
- [time.ts](../src/utils/time.ts): conversioni e formattazione degli orari.

I JSDoc delle funzioni descrivono input, risultati e casi limite; i relativi test sono
in [utils.test.cjs](../tests/utils.test.cjs). Le riesportazioni dal dominio mantengono
la compatibilità con i chiamanti esistenti.

Durata massima degli eventi, ricorrenze, attribuzione degli esiti e denominatori
statistici appartengono al dominio/repository. Le utility evitano duplicazioni senza
decidere queste regole. Arrotondamenti e distinzione tra zero e assenza di dati
restano espliciti nei chiamanti.

Le costanti statiche sono in `src/constants.ts`, organizzate per argomento. Istanze
di servizi, context React, archivi inizializzati e URL degli asset risolti con
`import.meta.url` restano nei moduli che ne gestiscono il ciclo di vita o la risoluzione.

## Test per invarianti e scenari

Preferire verifiche delle regole osservabili a test che ripetono l’implementazione.
Per un calendario o un planner possono esistere più soluzioni valide: non vincolare
il test a un unico ordine di blocchi se quell’ordine non è un requisito.

- Verificare contratti e input non validi, date civili, assenza di sovrapposizioni,
  protezione dei vincoli e identità delle occorrenze spostate.
- Usare scenari sintetici riproducibili, inclusi ricorrenze, eccezioni, confini di
  settimana e intervalli notturni; conservare casi di regressione per i difetti corretti.
- Verificare su archivi temporanei atomicità, revisioni, recupero dati e conservazione
  dello storico. Non usare il database personale.
- Per un futuro planner assistito aggiungere controlli su finestre disponibili,
  capacità, buffer e obiettivi secondo requisiti espliciti. L’eventuale output AI deve
  rispettare schema e vincoli e non produrre scritture prima della conferma.

Le misure di qualità delle proposte (copertura degli obiettivi, distribuzione del
carico, compatibilità con le preferenze) restano distinte dai vincoli obbligatori.
Questi criteri orientano i test futuri; non indicano che il planner sia già integrato.

## Riferimenti

- [Configurazione ESLint](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Analisi TypeScript con informazioni sui tipi](https://typescript-eslint.io/getting-started/typed-linting/)
- [Isolamento del contesto Electron](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
