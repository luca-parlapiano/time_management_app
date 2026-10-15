# Valutazione di prodotto: mantenere le routine?

14 ottobre 2026. La raccomandazione di rimuovere la nuova scelta Routine è stata
applicata all’interfaccia; la sequenza di azioni resta da validare.
Il [piano Routine del 9 ottobre](piano-implementazione-routine.md)
è una proposta tecnica precedente, non una funzionalità disponibile.

## Raccomandazione

Non mantenere la **routine attuale** come terzo tipo da creare. Era una sola
attività ricorrente flessibile, senza traguardo. Dal punto di vista dell’utente si
sovrappone a un appuntamento ricorrente o a un’abitudine a step. La scelta in
«Come vuoi imparare?» richiede di capire una distinzione che il prodotto non rende
utile durante l’uso.

Conservare integralmente le routine già salvate: date, esiti e statistiche restano
consultabili e modificabili. Togliere la scelta per crearne di nuove è una modifica
dell’interfaccia, non una migrazione o una cancellazione dei dati. Per gli elementi
esistenti usare una descrizione esplicita, ad esempio «attività ricorrente monitorata»,
finché la loro eventuale conversione non sarà definita con l’utente.

Non implementare ora una nuova categoria «Routine con azioni». Una sequenza può avere
valore, ma la sua utilità va dimostrata prima di introdurre editor, sessioni, revisioni
ed evoluzioni del database. Non spostare il centro dell’esperienza sul Calendario:
se una futura routine sarà utile, il suo accesso principale dovrà essere nella
dashboard Oggi e nel flusso Crea. Il Calendario gestirà solo date e orari.

## Distinzione comprensibile all’utente

| Cosa vuole fare | Funzione |
| --- | --- |
| Ripetere e valutare un comportamento un certo numero di volte | Abitudine a step |
| Raggiungere un obiettivo di tempo | Abitudine a ore |
| Riservare uno spazio a un impegno singolo o ricorrente | Appuntamento |
| Preparare e seguire più azioni come un solo momento | Ipotesi di routine da validare |

La quarta riga merita un tipo separato solo se il gruppo offre un vantaggio reale:
creare una volta la sequenza, ritrovarla nella giornata, avviarla e riprenderla
senza cercare le sue azioni in appuntamenti distinti. «Insieme» significa un solo
momento da organizzare; le singole spunte possono restare parziali.

## Come validare l’ipotesi senza costruire il sistema

1. Usare esempi concreti come «Chiudo la giornata» con tre azioni da cinque minuti.
   Chiedere quali utenti organizzerebbero e riutilizzerebbero davvero la sequenza;
   una sola attività ricorrente deve restare un appuntamento.
2. Preparare un prototipo della dashboard Oggi: una card «Chiudo la giornata», con
   «Inizia», azioni da spuntare e «Riprendi». Un’eventuale modifica dell’orario apre
   il calendario, senza farne il punto di partenza.
3. Provare il prototipo con chi usa l’app. Osservare se la sequenza viene riusata,
   se le persone la cercano spontaneamente nella dashboard e se la checklist
   risolve un problema che le abitudini e gli appuntamenti attuali non risolvono.
4. Decidere dopo la prova: se il vantaggio è chiaro, realizzare il modello a
   sequenze; altrimenti lasciare l’app con le due abitudini e gli appuntamenti.

Non fissare una soglia numerica arbitraria prima della prova. Documentare i casi
d’uso osservati, le difficoltà e quali passaggi il gruppo ha semplificato.

## Stato dell’applicazione e passi successivi

| Fase | Stato o cambiamento | Verifica |
| --- | --- | --- |
| 1. Linguaggio | Applicato: Crea offre solo abitudini a step e a ore; aggiornati i testi di aiuto | Chi crea un’abitudine sceglie fra eventi e tempo |
| 2. Compatibilità | Applicata: l’editor delle attività monitorate già salvate e le regole degli esiti restano disponibili | Storico, statistiche e backup conservati |
| 3. Creazione alternativa | Disponibile: appuntamento ricorrente per un’attività singola senza traguardo | Data, ripetizione e modifica restano disponibili |
| 4. Prototipo | Mostrare un gruppo di azioni nella dashboard con dati di prova | La funzione è valutabile senza toccare il database reale |
| 5. Decisione | Scegliere se finanziare la nuova funzione dopo la prova | Motivazione basata sugli usi, non sul solo nome «Routine» |

L’eventuale fase di implementazione della nuova sequenza può riutilizzare dal piano
precedente identità delle occorrenze, sessioni persistenti, revisioni e tutela dei
dati legacy. L’ordine delle superfici cambia: **Crea e Oggi prima, Calendario per
la pianificazione**. Prima di implementarla va aggiornata la baseline tecnica:
l’archivio è alla versione 3 e SQLite alla versione 5; i numeri del piano del 9
ottobre sono superati.

Per la rimozione della scelta di creazione sono stati verificati `npm run lint`,
`npm run typecheck`, `npm test`, `npm run build` e le schermate con archivi di prova,
inclusi elementi legacy. Nessun test sul database personale.
