# Time Planner — Calendario locale

Calendario desktop locale basato su Electron, React, Vite e TypeScript. Si usa subito,
senza creare un piano o compilare un profilo. Nessun account, backend, cloud o sincronizzazione.

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

L'app si apre sulla settimana corrente, con date reali e navigazione precedente/successiva/Oggi.

- Creazione, modifica, spostamento tramite date/orari ed eliminazione dal calendario.
- Impegni fissi e tempo protetto con lucchetto e sblocco esplicito.
- Vincoli singoli o ricorrenti settimanali, con eccezioni per singole date.
- Attività flessibili con stato da fare, completato o saltato.
- Note, durata calcolata e collegamenti facoltativi a obiettivi stabili.
- Profilo facoltativo, senza rigenerazione degli elementi.
- Persistenza locale e segnalazione dei conflitti e degli errori di salvataggio.
- Svuotamento di tutte le settimane con conferma, conservando profilo, obiettivi e palette.
- Selettore di palette (Calma naturale, Studio essenziale, Notte tranquilla).
- Recupero esportabile dei dati precedenti, conservati senza attribuire date ai vecchi blocchi.

Dettagli del modello, ricorrenze, recupero e limiti: [Calendario continuo](docs/calendario-continuo.md).
I documenti sul motore originale descrivono il prototipo storico; il nuovo flusso è quello
indicato in questo documento.

## Verifiche

```bash
npm test
npm run typecheck
npm run build
```

## File chiave da leggere per capire Electron

- `package.json`
- `electron/main.ts`
- `src/App.tsx`
- `src/domain/calendar.ts`
- `src/infrastructure/localCalendarStorage.ts`

## AI locale (percorso storico disabilitato nella home)

La chat del prototipo rigenerava il piano ed è stata scollegata dal calendario.
Non serve installare un modello per usare l'app. Il runtime e i comandi seguenti
rimangono disponibili nel repository per gli esperimenti precedenti.

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
