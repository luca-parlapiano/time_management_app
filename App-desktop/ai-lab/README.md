# AI Lab

> **Percorso sperimentale del prototipo.** Il calendario principale non usa la chat
> né richiede un modello. Queste istruzioni riguardano il laboratorio/runtime storico.
> Vedi [stato del progetto](../docs/stato-progetto.md) e [indice](../docs/README.md).

Questa cartella contiene solo dataset e strumenti offline per addestrare e valutare
l'interprete `PlanningIntent`. Non contiene il runtime dell'app: Electron usa direttamente
`llama-server`, senza Python, PyTorch, Transformers o PEFT in produzione.

## Contratto

Il prompt e lo schema usati dall'app sono le copie canoniche in:

- `resources/ai/planning-intent.txt`
- `resources/ai/planning-intent.schema.json`

Il modello estrae goal, task, habit, vincoli e preferenze. Questo contratto appartiene
al prototipo storico: il planner TypeScript che ne generava la settimana è stato rimosso
e l'output non viene applicato al calendario corrente.

## Struttura

```text
ai-lab/
  data/                   # train, validation e test JSONL
  scripts/
    validate-dataset.mjs
    planning-intent-validation.mjs
    planning-intent-grounding.mjs
    evaluate-model-output.mjs
    run-model.py          # valutazione offline su GPU CUDA
    train-adapter.py      # training QLoRA offline su GPU CUDA
  requirements.txt       # dipendenze solo per training e valutazione
```

## Modello corrente

- base di training: `Qwen/Qwen3-4B`;
- LoRA: rank 8, alpha 16, dropout 0,05;
- moduli: `q_proj`, `k_proj`, `v_proj`, `o_proj`.

Conversione dell’adapter e percorsi per l’uso desktop sono descritti nel
[runtime AI](../docs/architettura-distribuzione-ai.md#lora).

## Comandi

```bash
node ai-lab/scripts/validate-dataset.mjs
python ai-lab/scripts/train-adapter.py --check-only
python ai-lab/scripts/train-adapter.py --allow-download
python ai-lab/scripts/run-model.py --allow-download \
  --adapter ai-lab/adapters/qwen3-4b-planning-intent
```

PyTorch rimane confinato a questi comandi offline e non viene installato o caricato
dall'app Electron.
