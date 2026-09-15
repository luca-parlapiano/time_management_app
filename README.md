# Time Planner Prototype

Prototipo desktop locale basato su Electron, React, Vite e TypeScript. La prima release
non usa account, backend, cloud, sincronizzazione o smartwatch: il piano resta sul dispositivo.

## Struttura

- `electron/`: processo principale Electron
- `src/`: interfaccia React e primo planner locale
- `src/planner/`: contratti e logica prototipo
- `docs/`: note di prodotto e di motore

## Come gira il progetto

Ci sono due compilazioni separate:

1. `vite` compila la UI React nel browser renderer
2. `tsc` compila `electron/main.ts` e `electron/preload.ts`

Quando lanci `npm run dev`:

- parte il server Vite su `http://127.0.0.1:5173`
- TypeScript compila i file Electron in `dist-electron/`
- Electron apre una finestra desktop e carica la UI locale

Quando lanci `npm run build`:

- Vite produce `dist/`
- TypeScript produce `dist-electron/`

## Comandi

```bash
npm install
npm run dev
```

Per compilare senza aprire il server di sviluppo:

```bash
npm run build
```

## Punto di partenza dell'app

L'app si apre con:

- calendario settimanale
- scenari preset per simulare profili utente diversi
- bottone `Modifica profilo`
- modale con domande base e profilo energia
- pannello di osservabilita` con feature derivate e decision trace
- generazione piano locale in TypeScript
- persistenza locale del profilo, piano attivo e stato dei blocchi tra i riavvii
- chat locale con Qwen3-4B Q4 tramite `llama.cpp`, senza runtime Python

## File chiave da leggere per capire Electron

- `package.json`
- `electron/main.ts`
- `src/App.tsx`
- `src/planner/mockPlanner.ts`

## AI locale

Installa `llama.cpp` una volta:

```bash
# macOS
brew install llama.cpp

# Windows
winget install llama.cpp
```

Scarica il modello da Hugging Face direttamente nella directory dell'app:

```bash
npm run ai:download-model
```

Il comando salva Qwen3-4B `Q4_K_M` (circa 2,5 GB) in
`resources/ai/models/qwen3-4b-q4_k_m.gguf`. Se il download viene interrotto, il lancio
successivo riparte dal file `.part`. In assenza del file locale, l'app puo ancora usare
la cache gestita da `llama.cpp`.

Le configurazioni opzionali sono:

- `PLANNER_LLAMA_SERVER`: percorso dell'eseguibile `llama-server`;
- `PLANNER_LLAMA_URL`: URL di un server gia avviato;
- `PLANNER_LLAMA_API_KEY`: chiave del server esterno, se configurata;
- `PLANNER_AI_MODEL`: percorso di un GGUF diverso;
- `PLANNER_AI_LORA`: percorso di un adapter LoRA GGUF compatibile con il modello.
