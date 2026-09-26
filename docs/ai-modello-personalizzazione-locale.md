# AI, Modello E Personalizzazione Locale

> **Proposta di evoluzione, non comportamento implementato.** La chat è disabilitata
> nel calendario principale; memoria adattiva e ranking personale descritti qui
> restano obiettivi da validare. Il runtime sperimentale è descritto separatamente in
> [architettura AI](architettura-distribuzione-ai.md).
> [Stato del progetto](stato-progetto.md) · [Indice](README.md).

## Decisione Di Prodotto

L'app puo' includere un modello AI addestrato da noi, ma non deve addestrare un modello
diverso per ogni persona ne' affidare a una chat generica le decisioni sul calendario.

Il prodotto e' composto da tre elementi distinti:

```text
Modello linguistico addestrato da noi
  + memoria locale e preferenze dell'utente
  + motore deterministico per slot, vincoli e capacita'
```

Il modello interpreta il linguaggio naturale e prepara proposte. Il motore verifica se sono
realistiche. L'utente decide sempre se salvarle.

## Cosa Significa "Modello Nostro"

Un modello generale puo' essere adattato al dominio del planning tramite un adapter LoRA.
L'adapter insegna il linguaggio del prodotto, il formato dei dati e il comportamento atteso:

- estrarre obiettivi, abitudini, vincoli e preferenze da testo libero;
- formulare domande mancanti brevi e utili;
- generare una proposta strutturata, mai una modifica automatica;
- mantenere un tono pratico e non giudicante.

L'adapter non contiene la vita privata delle persone. I dati personali, gli eventi e le
preferenze di ciascun utente restano nel database locale del suo dispositivo.

## Ruolo Dell'AI

L'AI e' un'interfaccia espressiva: permette all'utente di dire come vuole gestire il tempo
con parole proprie, invece di compilare prima molti form.

Esempio:

> "Lavoro fino alle 18, devo preparare un esame, voglio riprendere palestra tre volte ma
> la sera sono scarico."

L'AI produce una bozza `PlanningIntent` con:

- obiettivi e priorita' dichiarate;
- abitudini, frequenze e durate da confermare;
- impegni fissi e vincoli;
- preferenze, come bassa energia serale;
- domande ancora necessarie per pianificare.

Il motore slot usa poi questi dati per verificare capacita', conflitti, sonno, buffer e
priorita'. L'output e' una proposta che l'utente vede, modifica o rifiuta.

Usi ammissibili, solo su richiesta esplicita:

- trasformare un brain dump in bozze di task, routine e sotto-step;
- proporre una durata o una priorita' dichiarandola come stima;
- riscrivere una routine in passi piu' piccoli e avviabili;
- spiegare in linguaggio semplice perche' il motore ha lasciato spazio o buffer;
- proporre alternative dopo un piano saltato, senza applicarle.

## Parametri da raccogliere solo quando servono

Questa è una proposta per una futura pianificazione assistita, non un nuovo requisito
per aprire il calendario: il profilo attuale resta facoltativo.

| Area | Informazioni utili alla proposta |
| --- | --- |
| Obiettivi | Priorità dichiarate, frequenza o tempo desiderato, orizzonte e date della proposta |
| Vincoli | Impegni fissi, tempo protetto, sonno/veglia e indisponibilità esplicite |
| Preferenze | Fasce di energia, durata dei blocchi, granularità, flessibilità e margini desiderati |
| Contesto facoltativo | Abitudini esistenti, stile di lavoro, difficoltà dichiarate e modalità di feedback |

Riutilizzare i dati già presenti nel calendario e chiedere soltanto ciò che manca per
la richiesta concreta. Il motore deve calcolare disponibilità residua, saturazione,
compatibilità degli obiettivi e buffer; il modello non deve inventare questi valori.
Preferenze osservate e priorità dichiarate devono rimanere distinguibili e correggibili.

## Cosa L'AI Non Fa

- non modifica automaticamente impegni, routine o obiettivi;
- non decide quali priorita' sono importanti per una persona;
- non accede implicitamente a dati personali o storico;
- non invia dati personali a un servizio remoto senza consenso chiaro e revocabile;
- non fa promesse cliniche su ADHD, salute mentale o produttivita';
- non e' necessaria per aprire, usare, esportare o recuperare i dati locali.

## Personalizzazione Che Impara Davvero

La personalizzazione non richiede il retraining continuo di un LLM. L'app registra in locale
gli esiti che aiutano il motore a fare proposte migliori:

- piano accettato, modificato o rifiutato;
- attivita' completata, saltata o rinviata;
- durata stimata e durata reale;
- slot scelto o spostato;
- fascia oraria, contesto e motivo dichiarato dello skip;
- ricorrenza effettiva delle abitudini.

Questi segnali alimentano un profilo di preferenze e un ranking degli slot. Per esempio,
l'app puo' imparare che una persona completa piu' facilmente 25 minuti di studio al mattino
e non proporre una sessione lunga dopo il lavoro. Questa e' una previsione locale,
controllabile e correggibile; non una conclusione sulla persona.

### Dati di feedback da valutare

Lo storico corrente conserva esiti e correzioni, identità originale dell’occorrenza,
data dell’appuntamento e momento di registrazione. La personalizzazione proposta
richiederebbe ulteriori segnali, da progettare prima di estendere lo schema:

- accettazione, modifica o rifiuto di una proposta;
- spostamento, rinvio o accorciamento, collegati all’appuntamento originale;
- inizio/fine pianificati e reali, per confrontare stima e durata effettiva;
- motivo dello skip, nota ed energia prima/dopo, solo se forniti volontariamente.

Questi dati potrebbero servire a stimare riuscita per fascia oraria, errore di durata e
bisogno di buffer. Non introducono un nuovo punteggio di completamento né modificano
le [regole statistiche attuali](provider-database-model.md#statistiche-giornaliere).

## Flusso Sicuro

```text
Richiesta esplicita dell’utente, tramite testo o voce
  -> AI: bozza di PlanningIntent
  -> validazione JSON e schema
  -> motore locale: vincoli, slot, capacita' e buffer
  -> anteprima delle modifiche
  -> conferma dell'utente
  -> salvataggio delle modifiche approvate
  -> esecuzione e registrazione locale degli esiti
```

L'AI non puo' saltare i passaggi di validazione o conferma. Se una proposta viola i
vincoli, viene rifiutata o riformulata prima dell’anteprima; non viene applicata al
calendario. La conferma riguarda modifiche concrete e visibili, non una rigenerazione
implicita dell’intero piano.

## Architettura Desktop Senza Backend

Il modello puo' funzionare localmente nel client Electron:

```text
UI Electron/React
  -> processo principale Electron
  -> runtime LLM locale
  -> modello base + adapter LoRA
  -> JSON strutturato
  -> planner locale
  -> storage locale
```

Questa strada evita un server proprietario e costi di inferenza per richiesta. Rimangono
comunque costi di prodotto: download del modello, spazio disco, RAM, velocita' diversa tra
computer e manutenzione degli aggiornamenti.

`llama.cpp` supporta modelli eseguiti localmente in formato GGUF e adapter LoRA applicati
separatamente al modello base. Le licenze del modello base e dell'adapter devono essere
verificate prima della distribuzione open-source.

## Percorso di realizzazione

La sequenza condizionata alla validazione è mantenuta nello
[stato del progetto](stato-progetto.md#percorso-ai-condizionato-alla-validazione).
Questo documento definisce la proposta e i criteri con cui valutarne l’utilità.

## Metriche Di Validazione

- percentuale di proposte AI che producono JSON valido;
- percentuale di proposte che passano i vincoli del planner;
- percentuale di proposte accettate o modificate poco;
- tempo risparmiato per creare il primo piano;
- completamento reale dei blocchi proposti rispetto a quelli creati manualmente;
- memoria e tempo di risposta su hardware desktop minimo dichiarato.

## Fonti Tecniche

- [llama.cpp: modelli locali in GGUF](https://github.com/ggml-org/llama.cpp/blob/master/docs/models.md)
- [llama.cpp: adapter LoRA](https://github.com/ggml-org/llama.cpp/blob/master/examples/main/README.md)
