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
- Progressi: riepilogo giornaliero, tempo settimanale e trofei.

La prima iterazione non include ancora gli editor completi del calendario, la
conclusione/ripetizione delle serie a ore, né import/export dei backup.

## Regole condivise

`src/core/` è generato da `../App-desktop/src/` con `npm run sync:core`. Lo script
adatta gli import `.js` per Metro e usa `expo-crypto` per gli ID dello storico.
Modificare le regole nel desktop e rieseguire la sincronizzazione, così entrambe le
app mantengono gli stessi calcoli. `npm run check:core` segnala copie non allineate.

## Verifiche

```bash
npm run check:core
npm run lint
npm run typecheck
npx expo-doctor
```
