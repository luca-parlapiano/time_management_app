# Abitudini con obiettivo di ore

Implementazione aggiornata il 13 ottobre 2026.

Il pulsante **Crea** nell’header principale apre «Come vuoi imparare?» da tutte
le schermate. La scelta a ore permette di impostare una **settimana** o un **mese**
e un numero di ore con un selettore grande, modificabile direttamente o con +/−.
La data iniziale è automaticamente oggi. Non sono richiesti appuntamenti.

## Una serie alla volta

Ogni serie conserva ID, tipo di periodo, date e obiettivo propri. Termina la domenica
oppure l’ultimo giorno del mese civile. Una partenza a periodo iniziato mantiene
l’obiettivo scelto: la UI segnala il periodo parziale. Le registrazioni e le ore
oltre il target restano nella serie di appartenenza e non passano alle successive.

Alla prima apertura dopo la scadenza, anche al cambio giorno con l’app aperta,
compare un riepilogo con obiettivo e ore raggiunte. Se il target è raggiunto o
superato compare un trofeo. Si sceglie tra:

- **Ripeti la serie**: conferma la precedente e crea una nuova serie da oggi, nel
  periodo corrente, con lo stesso tipo e target e con zero ore. I periodi saltati
  non diventano serie vuote.
- **Va bene così**: conferma il risultato e archivia il percorso.

Chiudere la modale rimanda la scelta; «Concludi la serie» nel dettaglio la riapre.
La conferma è persistita e idempotente. Dopo la conferma, diario e obiettivo di
quella serie restano consultabili in sola lettura. Prima della conferma è possibile
correggere o completare il diario entro le sue date. Il periodo di una serie avviata
non può cambiare; la modifica del target riguarda solo la serie ancora in corso.

## Registrazione e consultazione

- **Oggi** mostra totale, obiettivo e le ultime quattro registrazioni della serie
  corrente, con data, durata e nota. «Mostra tutte» espande il resto. L’ordine segue
  il primo inserimento: correzioni e ripristini non duplicano o spostano le voci.
- **Abitudini → A ore** permette di scegliere una serie e consultare il suo diario,
  compresi risultati precedenti e registrazioni rimosse. Le serie aperte consentono
  aggiunta, modifica, rimozione e ripristino delle registrazioni.
- **Calendario** mostra il diario fuori dalla griglia oraria. Gli appuntamenti
  facoltativi restano separati dal tempo svolto. Si può collegare una registrazione
  esistente senza duplicarla; una pianificazione resta entro la propria serie.
- **Trofei** raccoglie un risultato per ogni serie confermata a obiettivo raggiunto.

Le sessioni richiedono minuti interi positivi, fino a 24 ore per abitudine e giornata.
Non si registra tempo futuro. I target ammettono fino a 168 ore per settimana e
744 ore per mese. Cambiare la data di una sessione non può trasferirla a un’altra serie.

## Modello e compatibilità

`WeeklyTimeHabit` mantiene l’identità dell’abitudine e una raccolta `TimeSeries`.
Il nome tecnico precedente è conservato per limitare modifiche ai contratti.
Le serie hanno intervalli disgiunti; `TimeSession` e il suo audit conservano le date
originali. `StatisticsRepository` calcola risultati e trofei sullo snapshot confermato,
senza salvare totali derivati. Gli esiti binari delle abitudini a step non cambiano.

Gli archivi a ore precedenti vengono convertiti alle settimane note, conservando
sessioni e audit. Le settimane storiche sono concluse; l’ultima resta in attesa della
scelta se già scaduta. La conversione non crea settimane vuote tra quelle registrate.
La lettura è compatibile con backup v3 e schema SQLite 5: le serie sono incluse nel
JSON della definizione esistente e vengono persistite al successivo salvataggio.
Import/export, copia precedente, revisioni e transazioni comprendono anche le serie.

## Verifiche

- `tests/weekly-time.test.cjs`: isolamento, eccedenze, retry, stop, mesi civili,
  anni bisestili, periodi saltati, conversione dei dati precedenti e backup.
- `tests/sqlite.test.mjs`: riapertura, rollback, serie mensili, risultati e scelte persistite.
- `/tests/time-series.browser.html`: conferma fallita, retry, riapertura e backup
  tramite Provider; anteprima con una serie riuscita e una sotto obiettivo.
- `/tests/weekly-time.browser.html` e `/tests/database.browser.html`: diario e
  regressioni di Provider/repository. Tutte le prove usano dati isolati.
