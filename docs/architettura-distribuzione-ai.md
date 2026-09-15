# Architettura E Distribuzione Dell'AI

## Decisione corrente

La chat desktop usa Qwen3-4B `Q4_K_M` attraverso `llama-server`. Il processo Electron
avvia il server una sola volta, attende `/health`, applica il template chat del GGUF e
richiede JSON vincolato dallo schema `PlanningIntent`.

```text
UI React
  -> IPC Electron
  -> LlamaPlanningRuntime
  -> llama-server
  -> Qwen3-4B Q4_K_M (+ LoRA GGUF opzionale)
  -> validazione PlanningIntent
  -> planner deterministico TypeScript
```

Il runtime dell'app non dipende da Python, PyTorch, Transformers o PEFT. Queste librerie
rimangono eventualmente utilizzabili solo nell'AI Lab offline per addestrare un adapter.

## Modello

Il modello predefinito e `Qwen/Qwen3-4B-GGUF:Q4_K_M`, circa 2,5 GB. `llama.cpp` lo
scarica nella propria cache alla prima esecuzione. Un GGUF gia scaricato puo essere posto
in `resources/ai/models/qwen3-4b-q4_k_m.gguf` oppure indicato con `PLANNER_AI_MODEL`.

Il processo resta attivo per tutta la sessione Electron, quindi il caricamento viene
pagato una sola volta. Il context e limitato a 2048 token e l'output a 384 token per
contenere memoria e latenza.

## Accelerazione multipiattaforma

L'app passa `--n-gpu-layers 99` e lascia a `llama.cpp` la selezione del backend disponibile:

- Metal sui Mac Apple Silicon;
- CUDA o Vulkan nelle build Windows che li includono;
- CPU quando non e disponibile un backend GPU.

Si puo includere un eseguibile specifico per piattaforma in
`resources/ai/bin/<platform>-<arch>/` oppure indicarlo con `PLANNER_LLAMA_SERVER`.
In sviluppo sono supportate anche le installazioni di sistema (`brew install llama.cpp`
su macOS e `winget install llama.cpp` su Windows).

## LoRA

`llama.cpp` carica un adapter tramite `--lora`. L'app lo abilita quando trova
`resources/ai/adapters/planning-intent-qwen3-4b.gguf` o il percorso specificato in
`PLANNER_AI_LORA`.

Un LoRA e legato all'architettura del modello base. L'adapter addestrato su Qwen3-4B deve
essere convertito in GGUF prima di essere caricato da `llama.cpp`. Lo stesso GGUF
dell'adapter e portabile tra macOS, Windows e Linux;
cambia soltanto l'eseguibile nativo di `llama.cpp`.

## Risorse versionate

```text
resources/ai/
  planning-intent.txt
  planning-intent.schema.json
  models/.gitkeep
  adapters/.gitkeep
  bin/.gitkeep
```

Modelli, adapter ed eseguibili nativi sono ignorati da Git per evitare di appesantire il
repository.
