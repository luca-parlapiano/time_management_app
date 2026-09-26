# Documentazione del progetto

Ultimo riallineamento al codice: 26 settembre 2026.

## Percorso di lettura

1. [README del progetto](../README.md): avvio, comandi e funzionalità principali.
2. [Stato del progetto](stato-progetto.md): implementato, limiti e lavoro aperto.
3. [Calendario continuo](calendario-continuo.md): comportamento dell’app e regole utente.
4. [Architettura, Provider, repository e modelli](provider-database-model.md): stack, confini tra processi, contratti, persistenza, loading e formule statistiche.
5. [Qualità del codice](code-quality.md) e [utility condivise](code-quality.md#utility-condivise-e-costanti): convenzioni e verifiche.

## Direzione di prodotto e proposte

Questi documenti descrivono obiettivi e ipotesi, non funzionalità tutte disponibili:

- [Strategia prodotto e benchmark](strategia-prodotto-e-benchmark.md): pubblico, valore e ipotesi da validare. I dati sui concorrenti non sono stati rivalidati nel riallineamento.
- [AI e personalizzazione locale](ai-modello-personalizzazione-locale.md): possibile evoluzione, subordinata a validazione e conferma dell’utente.

Lo [stato del progetto](stato-progetto.md) tiene separato ciò che esiste da queste proposte.

## Prototipo storico e laboratorio

Materiale conservato per capire gli esperimenti precedenti; non definisce il
comportamento dell’attuale calendario:

- [Runtime e distribuzione AI](architettura-distribuzione-ai.md).
- [AI Lab](../ai-lab/README.md): dataset, training e valutazione offline.

I parametri e i segnali di feedback ancora utili alla progettazione sono raccolti
nella [proposta AI](ai-modello-personalizzazione-locale.md); i criteri di test per
invarianti sono in [Qualità del codice](code-quality.md#test-per-invarianti-e-scenari).

## Riferimenti per argomento

| Argomento | Documento di riferimento |
| --- | --- |
| Avvio e sintesi | [README del progetto](../README.md) |
| Stato, risultati delle verifiche e priorità | [Stato del progetto](stato-progetto.md) |
| Comportamento utente e backup manuale | [Calendario](calendario-continuo.md) |
| Architettura, migrazione, persistenza e statistiche | [Provider e repository](provider-database-model.md) |
| Comandi di verifica, procedure e convenzioni | [Qualità del codice](code-quality.md) |
| Installazione e configurazione AI desktop | [Runtime AI](architettura-distribuzione-ai.md) |
| Training e valutazione offline | [AI Lab](../ai-lab/README.md) |
| Motivazioni di prodotto e proposta AI | [Strategia](strategia-prodotto-e-benchmark.md) e [personalizzazione](ai-modello-personalizzazione-locale.md) |

## Come mantenere i documenti

Negli altri documenti usare sintesi e collegamenti al riferimento, senza duplicare
procedure, configurazioni o sequenze di lavoro. Le istruzioni operative di `AGENTS.md`
restano il riferimento per gli agenti che lavorano sul repository.

- Descrivere il comportamento utente nel documento del calendario e i contratti tecnici nel documento dei Provider.
- Aggiornare lo stato del progetto quando una funzione passa da proposta a implementazione.
- Conservare le regole statistiche nel documento dei Provider, evitando formule duplicate in altre pagine.
- Marcare esplicitamente proposte e materiale storico; la presenza del codice di un esperimento non implica che sia accessibile dalla UI.
- Usare collegamenti relativi al repository e aggiornare i riferimenti quando cambia un percorso.
- Le istruzioni operative per chi modifica il codice restano in [AGENTS.md](../AGENTS.md).
