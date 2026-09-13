# AI Lab

Questa cartella contiene solo gli strumenti per addestrare e valutare l'interprete locale
del linguaggio naturale. Il calendario finale viene costruito dal planner deterministico
dell'app, non dal modello.

## I due contratti da non confondere

### 1. Output del modello: `PlanningIntent`

Lo schema canonico e `schemas/planning-intent.schema.json`.

| Categoria | Campi prodotti dal modello |
| --- | --- |
| `goals` | `name`, `priority?`, `desiredWeeklyMinutes?`, `deadlineExpression?`, `source` |
| `tasks` | `name`, `durationMinutes?`, `whenExpression?`, `deadlineExpression?`, `source` |
| `habits` | `name`, `frequency?`, `durationMinutes?`, `preferredWindow?`, `source` |
| `constraints` | `description`, `source` |
| `preferences` | `description`, `source` |
| `questions` | domande necessarie per completare i dati mancanti |

`source` vale `explicit` o `inferred`. I campi con `?` sono facoltativi. `priority` e
`desiredWeeklyMinutes` vengono estratti soltanto quando l'utente li dichiara. Il modello
conserva date e orari come testo e non crea direttamente blocchi di calendario.

### 2. Input effettivo del planner dell'app: `RawAnswers`

La fonte ufficiale e `src/domain/planning.ts`. Il planner richiede:

| Campo | Contenuto |
| --- | --- |
| `goals` | nome, priorita 1-5, minuti desiderati ogni settimana |
| `workStart`, `workEnd`, `workDays` | orario e giorni di lavoro |
| `wake`, `sleep` | finestra giornaliera disponibile |
| `focusMinutes` | durata preferita di un blocco focus |
| `flexibilityMode` | `rigid`, `mixed` o `flexible` |
| `energyProfile` | energia di mattina, pomeriggio e sera |
| campi opzionali | orizzonte, impegni fissi, tempo protetto, stile, intensita e difficolta |

Il LoRA attuale non produce ancora un `RawAnswers` completo. Il flusso corretto e:

```text
testo utente
  -> PlanningIntent prodotto dal modello
  -> validazione e controllo grounding
  -> anteprima e domande di conferma nell'app
  -> RawAnswers completo
  -> planner deterministico
  -> calendario proposto
```

Prima di integrare il modello bisogna quindi costruire nell'app il passaggio confermato da
`PlanningIntent` a `RawAnswers`. In particolare priorita e minuti settimanali non devono
essere inventati dal modello.

La base di questo passaggio e ora implementata in:

- `src/domain/planningIntent.ts`: tipi e validazione runtime dell'output non fidato;
- `src/application/planningIntentReview.ts`: domande mancanti, dati non ancora mappati e
  applicazione degli obiettivi soltanto dopo la conferma di priorita e minuti settimanali.

La revisione identifica inoltre durata e momento mancanti per i task, frequenza e durata
mancanti per le habit, espone `getNextPlanningQuestion` e permette la conferma finale solo
quando non restano domande obbligatorie.

Task, habit, constraint, preference e scadenze restano intenzionalmente in `unmapped` fino
a quando il dominio del planner non avra strutture operative equivalenti.

## Struttura corrente

```text
ai-lab/
  data/
    train.jsonl             # 160 esempi di training desktop
    validation.jsonl        # 41 esempi per la loss
    test.jsonl              # 15 esempi v5 congelati e mai usati
  prompts/
    planning-intent.txt     # unico prompt di training e inferenza
  schemas/
    planning-intent.schema.json
  scripts/
    validate-dataset.mjs
    planning-intent-validation.mjs
    planning-intent-grounding.mjs
    evaluate-model-output.mjs
    run-model.py
    train-adapter.py
  requirements.txt
```

`archive/` contiene localmente i file storici precedenti al consolidamento ed e ignorata da
Git. `adapters/`, `results/` e `.venv/` sono anch'esse cartelle locali ignorate da Git.

## Modello e training correnti

- Base: `Qwen/Qwen3-4B`, gia presente nella cache locale Hugging Face.
- Metodo: QLoRA NF4 a 4 bit, BF16, double quantization.
- LoRA: rank 8, alpha 16, dropout 0,05.
- Moduli: `q_proj`, `k_proj`, `v_proj`, `o_proj`.
- Batch GPU: 1; gradient accumulation: 16.
- Lunghezza massima: 1024 token; epoche: 3.
- Adapter desktop candidato: `adapters/qwen3-4b-planning-intent-v3.1-160`.

Sul holdout v5 l'adapter v3.1 ha prodotto il 100% di JSON validi, l'86,7% di output
accettati da schema e grounding, l'80% di accuratezza sui dettagli dei goal e nessun campo
temporale imprevisto. Gli output devono comunque passare dalla validazione e dalla
conferma dell'utente prima di modificare `RawAnswers`.

Gli adapter e i risultati precedenti sono conservati localmente in `archive/`. In
`adapters/` e `results/` restano soltanto il candidato desktop, il suo risultato sul
test v5 e l'input per le prove manuali.

## Comandi Git Bash

```bash
cd /c/Users/lucap/Desktop/Sviluppo/time_management_app
source ai-lab/.venv/Scripts/activate
node ai-lab/scripts/validate-dataset.mjs
python ai-lab/scripts/train-adapter.py --check-only
```

Test manuale con l'adapter corrente:

```bash
python ai-lab/scripts/run-model.py \
  --input ai-lab/results/manual-input.jsonl \
  --output ai-lab/results/manual-output.jsonl \
  --adapter ai-lab/adapters/qwen3-4b-planning-intent-v3.1-160
```


Valutazione del candidato desktop:

```bash
python ai-lab/scripts/run-model.py \
  --input ai-lab/data/test.jsonl \
  --output ai-lab/results/qwen3-4b-planning-intent-v3.1-160.jsonl \
  --adapter ai-lab/adapters/qwen3-4b-planning-intent-v3.1-160

node ai-lab/scripts/evaluate-model-output.mjs \
  ai-lab/results/qwen3-4b-planning-intent-v3.1-160.jsonl \
  ai-lab/data/test.jsonl
```

I runner usano soltanto i file locali. Il download e consentito esclusivamente passando
`--allow-download`.
