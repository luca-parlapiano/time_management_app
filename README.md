# Time Planner Prototype

Prototipo desktop locale basato su Electron, React, Vite e TypeScript.

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

## File chiave da leggere per capire Electron

- `package.json`
- `electron/main.ts`
- `src/App.tsx`
- `src/planner/mockPlanner.ts`
