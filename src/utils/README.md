# Utility condivise

Funzioni pure utilizzabili nel renderer e nei processi Electron, senza dipendenze da React, DOM o database.

- `numbers.ts`: controlli su numeri finiti, positivi, interi in un intervallo inclusivo e interi sicuri non negativi. Non convertono stringhe, booleani o valori nulli in numeri.
- `math.ts`: percentuali senza arrotondamento, limitazione a un intervallo (`clamp`) e modulo positivo. `percentage` restituisce zero per un totale nullo/negativo o parametri non finiti; non limita i risultati al 100%. La distinzione fra zero e assenza di dati resta al chiamante.
- `dates.ts`: date civili, validazione, inizio settimana e aritmetica UTC indipendente dall’ora legale. `today` usa la data locale. Le funzioni restano riesportate da `domain/calendar` per compatibilità.
- `time.ts`: conversioni HH:MM/minuti, ritorno nell’intervallo giornaliero e formattazione degli orari. Le conversioni ricevono valori già validati; la formattazione lascia invariati gli input non interpretabili, inclusi valori infiniti.

Le regole dell’app (durata massima degli eventi, ricorrenze, attribuzione degli esiti e denominatori statistici) appartengono al dominio/repository. Le utility evitano duplicazioni senza decidere queste regole. Gli arrotondamenti restano espliciti nei chiamanti.

Verifiche: `npm run typecheck`, `npm test`, `npm run build`. I casi limite sono in `tests/utils.test.cjs`.

Le costanti statiche sono raccolte in `src/constants.ts`, organizzate per argomento. I moduli precedenti mantengono gli export pubblici per compatibilità. Le istanze di servizi, i context React, gli archivi inizializzati e gli URL degli asset risolti con `import.meta.url` restano nei moduli che ne gestiscono il ciclo di vita o la risoluzione.
