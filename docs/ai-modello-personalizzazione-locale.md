# AI, Modello E Personalizzazione Locale

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

## Cosa L'AI Non Fa

- non modifica automaticamente impegni, routine o obiettivi;
- non decide quali priorita' sono importanti per una persona;
- non invia dati personali a un servizio remoto senza consenso esplicito;
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

## Flusso Sicuro

```text
Testo o voce dell'utente
  -> AI: bozza di PlanningIntent
  -> validazione JSON e schema
  -> motore locale: vincoli, slot, capacita' e buffer
  -> anteprima delle modifiche
  -> conferma dell'utente
  -> salvataggio locale degli esiti
```

L'AI non puo' saltare i passaggi di validazione o conferma.

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

## Roadmap Consigliata

1. Definire gli schemi `PlanningIntent`, `AIProposal` e `ProposalDiff`.
2. Completare il modello dati locale per piani, modifiche ed esiti reali.
3. Costruire il motore deterministico per validare slot, vincoli e capacita'.
4. Provare l'esperienza con un piccolo modello locale non addestrato.
5. Preparare 50-100 scenari annotati per valutare estrazione, domande mancanti e JSON valido.
6. Addestrare un primo adapter LoRA per `linguaggio utente -> intento strutturato`.
7. Introdurre ranking personale locale solo dopo aver raccolto esiti reali.

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
