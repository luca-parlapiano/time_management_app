# Test di isolamento dei dati

La sezione Dev e la pagina standalone del laboratorio sono state rimosse dall’app.
Restano le verifiche automatiche su archivi di prova in memoria, senza accesso ai dati personali.

- `npm test`: comprende isolamento delle istanze del repository, copia degli snapshot, revisioni e reset.
- Con `npm run dev:renderer`, apri `/tests/dev.browser.html`: verifica il Provider annidato, esiti ripetuti, correzioni, date future, chiusura/riapertura, cambi di giorni, errori atomici e isolamento dei dati copiati.
- `/tests/database.browser.html`: suite generale dei Provider, sempre su archivi di prova.

`src/repository/DevRepository.ts` resta come supporto delle suite di test; non è caricato dall’interfaccia dell’app.
