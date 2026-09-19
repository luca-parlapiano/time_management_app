# Calendario continuo locale — prima implementazione

Questo documento descrive il comportamento corrente e sostituisce, per l'interfaccia
principale, il flusso obbligatorio `profilo -> piano settimanale` dei documenti storici.

## Uso

L'app apre la settimana corrente (lunedì–domenica), anche senza profilo o obiettivi.
`Precedente`, `Successiva` e `Oggi` cambiano soltanto la vista. `Aggiungi attività` e i
pulsanti sui singoli giorni aprono lo stesso editor. Selezionare un elemento consente
modifica, spostamento tramite date/orari e cancellazione con conferma.

Tre tipi distinti:

- attività flessibile, con stato da fare/completato/saltato;
- impegno fisso, protetto da lucchetto;
- tempo protetto, protetto da lucchetto.

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

I vincoli possono essere singoli o settimanali, senza scadenza oppure con ultima data
inclusiva. Ogni serie riguarda un giorno della settimana; per lunedì–venerdì si creano
cinque serie. Non sono ancora previste ricorrenze per le attività flessibili.

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

## Persistenza e recupero

Archivio nuovo: `time-planner.calendar.v2` in `localStorage`, versione 2. Contiene
`items`, `goals` e `profile`. Ogni operazione è validata e salvata con un'unica scrittura
sincrona prima di aggiornare la UI. Un errore di quota/accesso non applica la modifica.
Archivi malformati o di versione sconosciuta non vengono sovrascritti: la UI blocca le
modifiche, segnala il problema e permette di esportare il testo originale disponibile.

Archivio precedente: `time-planner.local-state.v1`, conservato integralmente e mai
rimosso dal nuovo flusso. In sua presenza appare `Recupero del prototipo`, con consultazione
e download del JSON originale, anche se malformato. Include profilo, piano, obiettivi ed
esiti precedenti. Non viene attribuita alcuna data ai vecchi blocchi `mon`–`sun`.

La strategia scelta è il **recupero esplicito**, non una migrazione automatica: l'utente
può esportare i dati e ricreare gli elementi scegliendo le date corrette. Non è ancora
presente un importatore JSON o un assistente di conversione dei vecchi piani.
`Esporta calendario` esporta anche il nuovo archivio per ispezione/backup manuale.
La posizione dell'archivio resta legata all'origine del renderer e al profilo Electron,
come nel prototipo; browser di sviluppo ed Electron hanno archivi distinti.

## Svuotamento

`Svuota calendario` richiede conferma, elenca esplicitamente cosa cancella e, se ci sono
vincoli, richiede anche lo sblocco collettivo tramite checkbox. Cancella gli elementi di
**tutte** le settimane, serie, eccezioni, note e stati. Mantiene profilo, obiettivi,
palette e archivio v1. Non ricarica il vecchio piano e non genera nuovi elementi.
Annullare non modifica nulla. Lo svuotamento è atomico e senza annullamento successivo.

## Percorsi precedenti e limiti

La home non monta più wizard, onboarding generativo, simulatore, dashboard del vecchio
piano o chat. Il vecchio codice del motore e il runtime LLM rimangono nel repository
per gli esperimenti, ma non scrivono nel nuovo archivio. La chat è esplicitamente indicata
come disabilitata fino a un'integrazione compatibile con date, vincoli ed esiti.

Restano fuori: viste giorno/mese, drag-and-drop, ripianificazione automatica, nuove
funzioni AI, ricorrenze complesse, account, backend e sincronizzazione. Lo spostamento
manuale avviene nell'editor. Non sono introdotte dipendenze aggiuntive.

## Verifica riproducibile

```sh
npm test
npm run typecheck
npm run build
```

Il runner compila i moduli di dominio e persistenza in una cartella temporanea, esegue
`node:test` e rimuove soltanto quella cartella. La suite copre settimane distinte,
identificativi ed esiti stabili, riapertura dello storage, sblocco, protezione da
motore/AI, conflitti lontani nel futuro, serie finite/infinite, eccezioni spostate e
cancellate, modifiche di serie, sonno a cavallo di settimane, date civili, dati non validi,
errori di storage, recupero legacy e svuotamento. Confronta inoltre il rilevamento dei
conflitti con un'espansione esaustiva in 100 scenari deterministici.

Verifica manuale nel renderer su un'origine di prova separata: creazione senza profilo,
settimane diverse, stato completato, sblocco, spostamento di una sola occorrenza,
conflitto manuale rifiutato, serie intatta nella settimana successiva, collegamento a
obiettivo, persistenza dopo ricaricamento, conferma di svuotamento inizialmente disabilitata,
abilitazione dopo sblocco e annullamento senza perdita di dati. Nessun dato del normale
archivio del prototipo viene modificato da queste prove.
