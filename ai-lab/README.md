# AI Lab

Questa cartella contiene solo dataset e strumenti offline per addestrare e valutare
l'interprete `PlanningIntent`. Non contiene il runtime dell'app: Electron usa direttamente
`llama-server`, senza Python, PyTorch, Transformers o PEFT in produzione.

## Contratto

Il prompt e lo schema usati dall'app sono le copie canoniche in:

- `resources/ai/planning-intent.txt`
- `resources/ai/planning-intent.schema.json`

Il modello estrae goal, task, habit, vincoli e preferenze. Il calendario viene sempre
generato dal planner deterministico TypeScript dopo la validazione dell'output.

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
- runtime desktop: GGUF `Q4_K_M` tramite `llama.cpp`;
- LoRA: rank 8, alpha 16, dropout 0,05;
- moduli: `q_proj`, `k_proj`, `v_proj`, `o_proj`.

L'adapter deve essere convertito dal formato PEFT/Safetensors al formato GGUF con gli
strumenti di `llama.cpp` e salvato come
`resources/ai/adapters/planning-intent-qwen3-4b.gguf`.

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
