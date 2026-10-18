# MindMorrow mobile

Primo porting Expo (SDK 58) dell'app desktop. La UI React Native usa Expo Router,
mentre un archivio SQLite locale conserva calendario, esiti, abitudini e storico.

## Avvio

```bash
npm install
npm run start
```

Da Expo CLI aprire iOS o Android con Expo Go o un simulatore. Il database mobile è
separato da quello Electron: questa versione non importa automaticamente i dati
desktop. Il web mostra un'anteprima centrata del layout mobile; caricamento e
navigazione sono stati verificati nel browser locale.

## Funzioni disponibili

- Oggi: attività pianificate, esiti Fatto/Non fatto, progressi delle serie.
- Abitudini: creazione di serie a step e obiettivi a ore, registrazione del tempo,
  trofei facoltativi per le serie a step.
- Calendario: consultazione giornaliera delle occorrenze.
- Progressi: riepilogo delle serie concluse e grafico degli ultimi sei mesi,
  ultima serie per abitudine attiva, archivio cronologico con diario in sola lettura.

La prima iterazione non include ancora gli editor completi del calendario.

## Regole condivise

`src/core/` è generato da `../App-desktop/src/` con `npm run sync:core`. Lo script
adatta gli import `.js` per Metro e usa `expo-crypto` per gli ID dello storico.
Modificare le regole nel desktop e rieseguire la sincronizzazione, così entrambe le
app mantengono gli stessi calcoli. `npm run check:core` segnala copie non allineate.

Le schermate `src/screens/HabitsScreen.tsx` e `ProgressScreen.tsx` coordinano viste
separate nelle rispettive cartelle `habits/` e `progress/`; `settings/` contiene le
sezioni delle impostazioni. Le liste principali di abitudini e serie, oltre al
diario nell'archivio Progressi, montano solo le righe visibili. Le cronologie aperte
nella scheda Abitudini restano complete. Il prompt delle serie e i progressi derivati
si aggiornano sullo snapshot confermato.

## Prestazioni

`npm run bench:series` misura il calcolo delle serie su dati sintetici (480 serie,
1920 sessioni) e controlla i totali. Non misura rendering, SQLite o prestazioni del
dispositivo. Per valutare la fluidità sul simulatore, confrontare gli stessi flussi
con la modalità di sviluppo e con `npx expo start --no-dev --minify`, riaprendo
l'app dopo il cambio di modalità. Usare un archivio di prova separato.

## Verifiche

```bash
npm run check:core
npm run lint
npm run typecheck
npm run bench:series
npx expo-doctor
```
