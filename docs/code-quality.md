# Qualità del codice

La configurazione `eslint.config.mjs` usa ESLint 10 e TypeScript ESLint. È stata verificata con Node 22.16; usare una versione di Node compatibile con gli `engines` delle dipendenze bloccate nel lockfile.

## Comandi

- `npm run lint`: analizza sorgenti, processi Electron, test e script. Anche un warning fa fallire il comando.
- `npm run lint:fix`: applica le correzioni automatiche disponibili; verificare il diff.
- `npm run test:lint`: prova la configurazione con esempi ammessi e vietati; è incluso anche in `npm test`.
- `npm run typecheck`, `npm test`, `npm run build`: restano le verifiche di tipi, comportamento e compilazione.

## Ambienti

Il renderer dispone delle globali browser. Sono vietati gli import statici Node/Electron, gli import dinamici letterali di quei moduli e le globali Node come `process`, `require` e `Buffer`. Il codice accede alle funzionalità native attraverso il bridge esistente.

Main e worker dispongono delle globali Node. Il linter rileva configurazioni letterali con `nodeIntegration: true` o `contextIsolation: false`. Il preload ha regole di import dedicate: usa Electron e non importa moduli Node aggiuntivi o le principali API del main. Questi controlli non sostituiscono la verifica degli input IPC o una revisione di sicurezza.

Test browser e script/test Node hanno ambienti distinti. `tsconfig.eslint.json` include anche i test TypeScript e il preload per consentire l’analisi delle promesse. Non cambia le configurazioni di compilazione della produzione.

## Regole

Sono attivi i controlli raccomandati JavaScript/TypeScript, import di tipi, simboli inutilizzati, divieto di `any` esplicito, uso degli Hooks e dipendenze degli effetti. Le regole con informazioni sui tipi verificano promesse non attese, promesse usate nel contesto sbagliato e `await` su valori non attendibili come promesse.

Gli handler JSX asincroni restano ammessi per compatibilità con le interazioni esistenti: devono gestire gli errori internamente. `void` può segnalare una promessa intenzionalmente non attesa, ma non intercetta i rifiuti. Non usare queste eccezioni per nascondere errori. Le direttive di disattivazione inutilizzate sono errori.

Le istruzioni permanenti per lavorare nel repository sono in `AGENTS.md`.

## Riferimenti

- [Configurazione ESLint](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Analisi TypeScript con informazioni sui tipi](https://typescript-eslint.io/getting-started/typed-linting/)
- [Isolamento del contesto Electron](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
