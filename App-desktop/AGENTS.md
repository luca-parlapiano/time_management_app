# Istruzioni per lavorare sul progetto

## Comunicazione e ambito

- Comunicare in italiano e descrivere in modo concreto modifiche e verifiche.
- Completare il lavoro richiesto senza estendere il refactoring a funzionalità estranee.
- Preservare modifiche locali e dati dell’utente. Non eseguire commit o pubblicazioni se non richiesti.
- Preferire modifiche piccole e verificabili. Non introdurre nuove dipendenze se il codice esistente risolve già il problema.

## Architettura

- L’app usa React e TypeScript nel renderer, Electron nel main e SQLite in un worker.
- Il flusso dei dati è UI → `useDB`/`DBProvider` → `RepositoryDB` → bridge preload → main/worker → SQLite.
- La UI non accede direttamente al database, al filesystem o a IPC. Esporre le operazioni tramite il Provider.
- `LoadingProvider` gestisce il caricamento globale con modalità blocking, local o silent. Evitare un blocco globale per ogni salvataggio.
- `StatisticsRepository` calcola i dati derivati sullo snapshot confermato; non salvare totali derivati nel database.
- Le utility pure sono in `src/utils`, le costanti statiche in `src/constants.ts`, i tipi condivisi in `src/model` e le icone in `src/icons`.
- Non spostare in `constants.ts` istanze di servizi, context React, funzioni o variabili calcolate dai dati correnti.
- Prima di aggiungere un controllo numerico, un calcolo percentuale o una conversione di data/orario, verificare le utility esistenti.

## Organizzazione del codice

- I componenti gestiscono presentazione e interazioni; le regole dell’app appartengono al dominio/repository.
- Usare componenti di icone invece di inserire SVG nei componenti di pagina.
- Preferire funzioni con un compito chiaro e nomi descrittivi. Dividere i componenti quando mescolano responsabilità, senza creare wrapper superflui.
- Documentare le funzioni condivise con JSDoc in italiano: scopo, input, risultato e casi limite utili.
- Usare `import type` per i tipi. Evitare `any`; validare gli input esterni da `unknown`.
- Gestire gli errori asincroni dove possono essere presentati all’utente. `void` indica una promessa intenzionalmente non attesa, ma non ne gestisce il rifiuto.
- Non disabilitare regole ESLint per nascondere problemi. Eventuali eccezioni devono essere locali e motivate.
- Aggiungere gli stili nella sezione pertinente, evitando nuove regole duplicate in fondo al foglio.

## Electron

- Mantenere `contextIsolation: true` e `nodeIntegration: false`.
- Il preload espone metodi specifici tramite `contextBridge`; non esporre `ipcRenderer` o funzioni IPC generiche alla pagina.
- Validare dati e mittente delle richieste IPC nel main. Il renderer non è una fonte attendibile.
- Conservare import `.js` nei moduli TypeScript consumati da Node/Electron e il formato `.cts` del preload.
- Le operazioni SQLite passano dal worker asincrono. Preservare transazioni, revisioni e storico degli esiti.
- Non usare il database reale dell’utente per test. Usare archivi in memoria o file temporanei.

## Calendario e statistiche

- Le date civili usano `YYYY-MM-DD`; usare le utility per evitare spostamenti dovuti a fuso orario e ora legale.
- Conservare l’identità originale delle occorrenze spostate e deduplicare le correzioni degli esiti.
- Una serie si conclude quando tutti gli step scelti hanno un esito, Fatto o Non fatto. Gli eventi fatti restano un conteggio distinto; correggere un esito non riapre la serie.
- Il completamento giornaliero usa attività superate / totale pianificato. I contributi hanno i colori delle attività; il resto è grigio.
- Senza esiti mostrare solo i pallini; non presentare gli appuntamenti futuri come risultati registrati.
- Gli esiti ammessi sono “Fatto” e “Non fatto”; l’assenza di esito resta distinta. Nella vista “Per attività” la media comprende tutte le occorrenze pianificate della giornata, contando solo quelle fatte al numeratore. Altre regole statistiche cambiano solo su richiesta esplicita.

## Verifiche

- `npm run lint`: controlli ESLint per renderer, Electron, test e script, senza warning.
- `npm run lint:fix`: correzioni automatiche; rileggere sempre il diff risultante.
- `npm run typecheck`: controlli TypeScript del renderer e di Electron.
- `npm test`: test di dominio, utility, statistiche e SQLite su dati temporanei.
- `npm run build`: build renderer ed Electron.
- Per modifiche ai Provider o alla inizializzazione del database, usare anche `/tests/database.browser.html` con Vite: usa dati di prova.
- Per modifiche visive, verificare l’interfaccia nel browser e le dimensioni interessate.
- Eseguire le verifiche pertinenti alla modifica e riportare eventuali limiti. Non aggiungere test che ripetano soltanto l’implementazione.
