# Calendario continuo locale

Questo documento descrive il comportamento corrente al 27 settembre 2026.
Il calendario non richiede il flusso `profilo -> piano settimanale` del prototipo.
[Indice documentazione](README.md) · [Stato del progetto](stato-progetto.md).

## Uso

L'app apre la settimana corrente (lunedì–domenica), anche senza profilo o obiettivi.
`Precedente`, `Successiva` e `Oggi` cambiano soltanto la vista. `Aggiungi attività` e i
pulsanti sui singoli giorni aprono lo stesso editor. Selezionare un elemento consente
modifica, spostamento tramite date/orari e cancellazione con conferma.

Tre tipi distinti:

- attività flessibile;
- impegno fisso, protetto da lucchetto;
- tempo protetto, protetto da lucchetto.

Gli appuntamenti possono avere esito fatto (`completed`) o non fatto (`skipped`); l’assenza di esito è distinta da un risultato negativo.
Registrare un esito non richiede lo sblocco dell’orario di un vincolo.

Titolo, inizio, fine, note e collegamento a un obiettivo appartengono all'elemento.
La durata è derivata, non memorizzata. Gli obiettivi hanno identificativi stabili;
rinominarli non rompe i collegamenti. Profilo e obiettivi si possono compilare
separatamente e non rigenerano né modificano gli elementi del calendario.

## Date e ricorrenze

Le date sono civili `YYYY-MM-DD`, gli orari locali `HH:mm` a 24 ore. La settimana e
l'aritmetica delle date non dipendono da conversioni UTC del fuso del dispositivo.
La durata è in minuti di orologio locale, non una misura del tempo trascorso attraverso
un cambio di ora legale. Sono supportati intervalli notturni, con data finale esplicita,
fino a 24 ore. Un elemento che attraversa la mezzanotte compare in entrambi i giorni;
la fine esattamente a mezzanotte non occupa il giorno seguente.

Tutti i tipi di elemento, comprese le attività flessibili, possono essere singoli o
settimanali, senza scadenza oppure con ultima data inclusiva. L’editor permette di
scegliere più giorni: il dominio crea una serie per giorno, collegata alle altre tramite
`activityId`. Gli esiti restano indipendenti per appuntamento. Serie esistenti possono
essere collegate esplicitamente; aspetto e identità condivisa non unificano i loro orari.

L'editor di una ricorrenza distingue esplicitamente:

- **Solo questa occorrenza**: salva una copia con le modifiche o una cancellazione nella
  mappa delle eccezioni, indicizzata dalla data originale. Lo spostamento può anche
  portarla in un'altra settimana, mantenendo la sua identità originale.
- **Intera serie**: modifica il modello per tutte le sue date, anche passate; conserva
  le eccezioni già salvate. La prima data e il giorno settimanale restano invariati.
  La fine della serie non può escludere eccezioni esistenti. Eliminare la serie elimina
  anche tutte le sue eccezioni.

Le occorrenze hanno ID derivato da ID della serie e data originale. Sono espanse solo
per la vista richiesta: non si materializzano infinite settimane nell'archivio.

## Vincoli e conflitti

Lo sblocco è una decisione temporanea ed esplicita dell'utente nell'editor. Vale per
l'ambito selezionato e non viene persistito; cambiando ambito occorre sbloccare di nuovo.
Un salvataggio torna sempre a mostrare il lucchetto.

Il livello di dominio distingue `user`, `engine` e `ai`: motore/AI non possono
modificare o eliminare vincoli, neppure passando `unlocked`. Possono inserire e modificare
solo attività flessibili, validate contro tutti gli intervalli occupati.

Ogni inserimento o modifica manuale segnala e rifiuta le sovrapposizioni, anche tra
attività flessibili, senza spostare o accorciare altri elementi. Gli intervalli adiacenti
sono consentiti. Il controllo considera serie senza scadenza, scadenze, eccezioni,
spostamenti e intervalli notturni, anche fuori dalla settimana visualizzata.

Il controllo delle serie non ha un orizzonte arbitrario: tra le date che introducono
una variazione (inizio/fine serie, date originali e nuove date delle eccezioni) il
modello si ripete ogni sette giorni. Una finestra completa intorno a ciascuna variazione
copre quindi anche conflitti futuri. Questo algoritmo privilegia la correttezza per
archivi personali; non è ottimizzato per grandi quantità di serie ed eccezioni.

## Salvataggio e backup

Il calendario è salvato in SQLite sul dispositivo. Alla prima apertura parte vuoto.
Se un salvataggio fallisce, la modifica non viene applicata alla UI. Per trasferire
un archivio si usa l’importazione JSON, senza recuperi automatici da altri storage.

In **Impostazioni → Database locale e backup** sono disponibili:

- esportazione di calendario, profilo, obiettivi e storico in JSON;
- importazione del solo backup corrente, con calendario e storico;
- anteprima dei conteggi e conferma della sostituzione dei dati;
- esportazione della copia conservata prima dell’ultima importazione.

L’importazione sostituisce i dati, non li unisce. La palette è una preferenza del
dispositivo e non è inclusa nel backup. Lo storico conserva le correzioni degli esiti.

Per schema, percorso del database e dettagli dell’inizializzazione, vedere
[Provider, repository e modelli](provider-database-model.md).

## Svuotamento

`Svuota calendario` richiede conferma, elenca esplicitamente cosa cancella e, se ci sono
vincoli, richiede anche lo sblocco collettivo tramite checkbox. Cancella gli elementi di
**tutte** le settimane, serie, eccezioni, note e stati presenti negli elementi. Mantiene
lo storico degli esiti, il profilo, gli obiettivi, la palette.
Non ricarica il vecchio piano e non genera nuovi elementi.
Annullare non modifica nulla. Lo svuotamento è atomico e senza annullamento successivo.

## Percorsi precedenti e limiti

Wizard, onboarding generativo, simulatore, dashboard, chat e motore del vecchio piano
sono stati rimossi. Il runtime LLM rimane nel repository per esperimenti separati, ma
non è collegato alla UI e non scrive nel nuovo archivio.

Restano fuori: viste giorno/mese, drag-and-drop, ripianificazione automatica, nuove
funzioni AI, ricorrenze complesse, account, backend e sincronizzazione. Lo spostamento
manuale avviene nell'editor. Le statistiche sono accessibili in una sezione separata:
panoramica annuale e vista “Per attività”. Le formule e la distinzione tra pianificato ed esiti sono descritte in
[Provider, repository e modelli](provider-database-model.md#statistiche-giornaliere).

## Verifiche

Le [procedure automatiche, browser e manuali](code-quality.md#procedure-di-verifica)
sono raccolte nel documento sulla qualità. Gli esiti effettivamente rilevati sono
nello [stato del progetto](stato-progetto.md#evidenze-di-verifica).
