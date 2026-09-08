# Stack Tecnologico MVP Locale

## Decisione Di Prodotto

La prima release e' un'app desktop **local-first**, senza servizi remoti. Riduce il costo
operativo a zero e permette di verificare se il flusso `piano -> esecuzione -> recupero`
risolve un problema reale prima di costruire infrastruttura.

Il perimetro esplicitamente escluso dalla release 1 e':

- account e autenticazione;
- backend, API, database remoto e cloud;
- sincronizzazione tra dispositivi e backup remoto;
- client mobile e supporto smartwatch;
- AI remota, telemetria remota e integrazioni calendario;
- notifiche che dipendono da un servizio esterno.

## Stack Corrente

- Electron per il client desktop;
- React + Vite per l'interfaccia renderer;
- TypeScript per UI e motore di pianificazione;
- motore deterministico locale in `src/planner/`;
- simulazione locale in `src/simulation/`;
- `localStorage` del renderer per profilo, piano e stato di esecuzione.

Il flusso effettivo e':

```text
UI React
  -> plannerAppService
  -> localPlannerGateway
  -> planner e simulatore locali
  -> localStorage sullo stesso dispositivo
```

Non esistono chiamate HTTP nel percorso dell'MVP.

## Dati Locali

La persistenza corrente conserva sul dispositivo:

- risposte dell'onboarding e profilo;
- piano generato e piano selezionato;
- completamenti, skip e altri eventi dei blocchi.

`localStorage` e' adatto a questo prototipo, non a dati sensibili o a grandi archivi. Prima
di una release pubblica desktop va valutato uno store locale gestito dal processo Electron
(file applicativo o SQLite), con export e cancellazione dati. Questo miglioramento resta
locale e non richiede cloud.

## AI Nella Release 1

Il planner resta deterministico e spiegabile. Non esiste un'AI attiva nella release 1.
Il contratto AI presente nel repository e' solo preparatorio: non invia dati e non deve
essere collegato a un modello remoto in questa fase.

In una fase successiva puo' aiutare esclusivamente a trasformare un input libero in una
bozza di task o routine. Ogni proposta deve essere validata dal motore locale, mostrata in
anteprima e confermata dall'utente prima del salvataggio. L'AI non puo' modificare il piano
in autonomia ne' diventare necessaria per accedere ai dati locali.

## Criteri Per Riaprire Il Cloud

Il cloud non va aggiunto per completezza. Va rivalutato solo se le interviste e i test d'uso
mostrano che la continuita' tra dispositivi o il backup sono un motivo concreto di abbandono.
Prima di allora, priorita' a timeline quotidiana, habit tracking, routine, completamento,
skip e ripianificazione manuale locale.
