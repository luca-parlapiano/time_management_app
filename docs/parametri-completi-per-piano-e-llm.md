# Parametri Completi Per Creare Un Piano E Progettare Un LLM

## Obiettivo Del File

Questo file raccoglie in un unico posto tutti i parametri utili a:

- creare un piano settimanale realistico
- capire cosa deve ricevere un LLM
- capire cosa invece deve essere calcolato dal motore
- progettare un dataset per addestramento, fine-tuning o valutazione

Il punto importante e' questo:

- non tutti i parametri devono essere scritti dall'utente
- non tutti i parametri devono essere decisi dal modello
- alcuni parametri sono input utente
- alcuni sono feature derivate
- alcuni sono vincoli di pianificazione
- alcuni sono output del piano
- altri ancora sono segnali di feedback utili per apprendimento futuro

## Lettura Corretta Del Problema

Se vuoi capire come creare o addestrare un LLM per questo prodotto, il problema non e' "generare testo sul time management".

Il problema reale e':

1. ricevere un profilo utente strutturato
2. trasformarlo in un problema di allocazione del tempo
3. produrre un piano compatibile con vincoli reali
4. osservare come l'utente reagisce
5. migliorare le proposte nel tempo

Quindi il dataset giusto non e' solo:

- `utente -> piano`

Ma piu' correttamente:

- `utente + vincoli + feature + storico -> proposta piano + motivazione + variante`

## I 5 Livelli Dei Parametri

Per progettare bene il sistema conviene separare i dati in 5 livelli.

### Livello 1: Input Grezzi Dell'Utente

Sono i dati raccolti nel wizard o in onboarding.

### Livello 2: Profilo Normalizzato

E' la struttura pulita che il motore usa davvero per pianificare.

### Livello 3: Feature Derivate

Sono valori calcolati dal sistema che aiutano a prendere decisioni.

### Livello 4: Vincoli E Preferenze Di Pianificazione

Sono le regole operative da rispettare quando si costruisce il piano.

### Livello 5: Output Del Piano E Feedback

Sono il piano finale, le spiegazioni, la scelta dell'utente e i dati comportamentali raccolti dopo.

## Livello 1: Input Grezzi Dell'Utente

Questi sono i parametri che l'utente puo' dare direttamente o che il wizard raccoglie.

### 1. Obiettivi

| Campo | Tipo | Esempio | Serve a |
| --- | --- | --- | --- |
| `goal.name` | string | `Studio AI` | Dare un nome al blocco da pianificare |
| `goal.priority` | int 1-5 | `5` | Decidere cosa difendere se il tempo non basta |
| `goal.desiredWeeklyMinutes` | int | `300` | Quantificare il fabbisogno settimanale |

### 2. Orizzonte Del Piano

| Campo | Tipo | Esempio | Serve a |
| --- | --- | --- | --- |
| `planDuration` | enum | `weekly`, `monthly`, `quarterly` | Definire il livello di orizzonte percepito dall'utente |

Nota:

- oggi il planner del prototipo costruisce comunque un piano settimanale
- questo campo serve soprattutto a orientare l'onboarding e le anteprime

### 3. Impegni Fissi

| Campo | Tipo | Esempio | Serve a |
| --- | --- | --- | --- |
| `fixedSchedule.title` | string | `Lavoro` | Identificare il vincolo |
| `fixedSchedule.days` | lista giorni | `["mon","tue","wed","thu","fri"]` | Sapere quando vale |
| `fixedSchedule.start` | `HH:MM` | `09:00` | Inizio del vincolo |
| `fixedSchedule.end` | `HH:MM` | `18:00` | Fine del vincolo |

Questa categoria dovrebbe includere:

- lavoro
- medicine
- appuntamenti ricorrenti
- routine fisse

### 4. Tempo Protetto O Tempo Libero

| Campo | Tipo | Esempio | Serve a |
| --- | --- | --- | --- |
| `protectedSchedule.title` | string | `Mercoledi pomeriggio libero` | Etichettare il tempo non occupabile |
| `protectedSchedule.days` | lista giorni | `["wed"]` | Sapere quando vale |
| `protectedSchedule.start` | `HH:MM` | `14:00` | Inizio fascia protetta |
| `protectedSchedule.end` | `HH:MM` | `18:00` | Fine fascia protetta |

### 5. Sonno E Ritmo Di Base

| Campo | Tipo | Esempio | Serve a |
| --- | --- | --- | --- |
| `sleepHoursTarget` | int | `8` | Proteggere il fabbisogno di sonno |
| `wake` | `HH:MM` | `07:00` | Definire inizio giornata disponibile |
| `sleep` | `HH:MM` | `23:30` | Definire fine giornata disponibile |

Nota importante:

- nel wizard attuale il valore esplicito raccolto e' soprattutto `sleepHoursTarget`
- `wake` e `sleep` possono essere derivati o richiesti in una fase successiva

### 6. Profilo Energetico

| Campo | Tipo | Esempio | Serve a |
| --- | --- | --- | --- |
| `energyProfile.morning` | enum `low/medium/high` | `high` | Stimare rendimento mattutino |
| `energyProfile.afternoon` | enum `low/medium/high` | `medium` | Stimare rendimento pomeridiano |
| `energyProfile.evening` | enum `low/medium/high` | `low` | Stimare rendimento serale |

### 7. Stile Di Focus E Lavoro

| Campo | Tipo | Esempio | Serve a |
| --- | --- | --- | --- |
| `focusBlockMinutes` | int | `60` | Durata base di un blocco focus |
| `workStyle` | enum | `deep_work`, `alternating`, `short_sprints` | Forma dei blocchi nella giornata |

### 8. Flessibilita' E Intensita'

| Campo | Tipo | Esempio | Serve a |
| --- | --- | --- | --- |
| `flexibilityMode` | enum | `rigid`, `mixed`, `flexible` | Quanti buffer lasciare |
| `planIntensity` | enum | `light`, `balanced`, `push` | Quanto pieno far percepire il piano |

### 9. Difficolta' Percepite

| Campo | Tipo | Esempio | Serve a |
| --- | --- | --- | --- |
| `mainDifficulties[]` | lista enum | `["procrastination","unexpected_events"]` | Rendere il piano piu' realistico |

Le categorie attuali sono:

- `procrastination`
- `overload`
- `context_switching`
- `unexpected_events`

### 10. Anteprima Selezionata

| Campo | Tipo | Esempio | Serve a |
| --- | --- | --- | --- |
| `selectedPreviewId` | enum | `deep-focus` | Dare un punto di partenza strategico |

Questo campo e' molto importante per il prodotto.

Non e' un semplice dettaglio UI.

E' una scelta esplicita dell'utente tra:

- piano equilibrato
- piano focus protetto
- piano flessibile
- piano sprint

Per un LLM questo e' un segnale molto forte, perche' ti dice come l'utente desidera essere pianificato prima ancora che tu abbia storico reale.

## Livello 2: Profilo Normalizzato

Questa e' la struttura che conviene dare al motore e che un LLM dovrebbe ricevere in input quando gli chiedi di ragionare sul piano.

### Campi Del Profilo Normalizzato

| Campo | Tipo | Origine |
| --- | --- | --- |
| `goals` | lista obiettivi | input utente |
| `planningHorizon` | enum | da `planDuration`, oggi forzato a `weekly` nel prototipo |
| `fixedCommitments` | lista blocchi | da impegni fissi |
| `protectedTime` | lista blocchi | da tempo protetto |
| `sleepWindow.wake` | `HH:MM` | esplicito o derivato |
| `sleepWindow.sleep` | `HH:MM` | esplicito o derivato |
| `energyProfile` | oggetto | input utente |
| `slotSizeMinutes` | int | oggi 30 nel prototipo |
| `focusBlockMinutes` | int | input utente |
| `flexibilityMode` | enum | input utente |
| `workStyle` | enum | input utente |
| `planIntensity` | enum | input utente |
| `mainDifficulties` | lista enum | input utente |
| `selectedPreviewId` | enum | input utente |

### Nota Sul Prototipo Attuale

Nel codice oggi esistono due livelli reali:

- `RawAnswers`
- `UserProfile`

Il prototipo oggi usa solo una parte del wizard per generare `RawAnswers`.

Per un LLM piu' evoluto, conviene estendere il profilo normalizzato per includere anche:

- `protectedTime`
- `workStyle`
- `planIntensity`
- `mainDifficulties`
- `selectedPreviewId`

## Livello 3: Feature Derivate

Queste non andrebbero chieste all'utente.

Devono essere calcolate dal sistema.

### Feature Derivate Gia' Presenti Nel Prototipo

| Campo | Tipo | Significato |
| --- | --- | --- |
| `sleepMinutesPerDay` | int | Minuti di sonno al giorno |
| `workMinutesPerWorkDay` | int | Durata del lavoro nei giorni lavorativi |
| `totalGoalMinutes` | int | Somma dei minuti richiesti dagli obiettivi |
| `weeklyCapacityMinutes` | int | Tempo settimanale disponibile teorico |
| `remainingWeeklyMinutes` | int | Margine residuo dopo aver sottratto i goal |
| `focusBlockMinutes` | int | Durata effettiva del blocco focus |
| `estimatedFocusBlocks` | int | Numero di blocchi focus necessari |
| `preferredFocusWindow` | enum | `morning`, `afternoon`, `evening` |
| `workloadLevel` | enum | `light`, `balanced`, `stretched`, `overloaded` |

### Feature Derivate Da Aggiungere In Futuro

| Campo | Tipo | Perche' serve |
| --- | --- | --- |
| `protectedMinutesPerWeek` | int | Capire quanto tempo l'utente vuole difendere |
| `fixedCommitmentVariance` | float | Capire quanto la settimana e' stabile |
| `goalPressureRatio` | float | Rapporto tra richiesta goal e tempo disponibile |
| `contextSwitchRisk` | float | Stimare rischio dispersione |
| `completionReliabilityByWindow` | mappa | Capire in quali fasce l'utente riesce davvero |
| `bufferNeedScore` | float | Stimare quanto buffer inserire |
| `scheduleRigidityScore` | float | Stimare quanto il piano puo' essere modificato |
| `replanProbability` | float | Stimare il rischio di dover rifare il piano |

## Livello 4: Vincoli E Preferenze Operative

Questi sono i parametri che il planner o il LLM devono rispettare.

### Hard Constraints

Vincoli che non devono essere violati:

- sonno
- lavoro
- medicine
- appuntamenti fissi
- tempo protetto dichiarato
- ore giornaliere massime

### Soft Constraints

Vincoli che si possono negoziare entro certi limiti:

- preferenza di lavorare al mattino o sera
- durata ideale del blocco
- alternanza o concentrazione
- desiderio di lasciare buffer

### Strategic Constraints

Vincoli di business o di qualità del piano:

- coprire almeno gli obiettivi prioritari
- non saturare tutti i giorni
- evitare piu' di `N` blocchi cognitivi pesanti consecutivi
- evitare assegnazioni impossibili su giorni gia' densi
- mantenere coerenza con l'anteprima scelta

## Livello 5: Output Del Piano

Questi sono i campi che il sistema deve produrre.

### Output Strutturato Minimo

| Campo | Tipo | Significato |
| --- | --- | --- |
| `plan.blocks[]` | lista | Blocchi concreti in calendario |
| `block.day` | enum giorno | Giorno della settimana |
| `block.start` | `HH:MM` | Inizio blocco |
| `block.end` | `HH:MM` | Fine blocco |
| `block.title` | string | Nome del blocco |
| `block.kind` | enum | `commitment`, `focus`, `buffer`, `recovery` |
| `block.rationale` | string | Motivazione sintetica |
| `plan.summary[]` | lista stringhe | Riassunto piano |
| `capacityCheck` | oggetto | Compatibilita' del piano |
| `decisions[]` | lista | Traccia delle scelte del motore |

### Output Utile Per Un LLM

Se il modello deve proporre o spiegare un piano, conviene chiedergli anche:

- `primary_strategy`
- `why_this_plan_fits`
- `main_risks`
- `fallback_if_day_is_skipped`
- `lighter_variant`
- `stronger_variant`

## Parametri Di Feedback E Osservazione

Se vuoi davvero addestrare o adattare un LLM, la parte piu' preziosa non e' l'onboarding iniziale.

Sono i segnali raccolti dopo.

### Eventi Da Salvare

| Campo | Tipo | Esempio |
| --- | --- | --- |
| `event_type` | enum | `completed`, `skipped`, `moved`, `shortened` |
| `block_id` | string | `wed-study-ai-focus-0` |
| `planned_day` | giorno | `wed` |
| `planned_start` | `HH:MM` | `19:00` |
| `actual_start` | `HH:MM?` | `19:20` |
| `actual_end` | `HH:MM?` | `20:00` |
| `completion_score` | float 0-1 | `0.75` |
| `mood_or_energy_before` | opzionale | `low` |
| `mood_or_energy_after` | opzionale | `medium` |
| `user_note` | string | `troppo stanco dopo lavoro` |

### Parametri Derivati Dal Feedback

- tasso di completamento per fascia oraria
- tasso di completamento per tipo blocco
- tolleranza reale al carico
- affidabilita' del weekend
- durata reale sostenibile dei blocchi
- scarto tra piano ideale e piano eseguito

Questa parte e' quella che nel tempo rende il sistema davvero proprietario.

## Dataset Consigliato Per LLM

Se vuoi fare dataset o fine-tuning, ogni record dovrebbe contenere almeno 4 sezioni.

### 1. Input Profilo

Profilo utente normalizzato.

### 2. Stato Del Contesto

Per esempio:

- settimana target
- eventi eccezionali
- carico residuo
- piano precedente
- eventuali giorni gia' saturi

### 3. Output Atteso

Per esempio:

- piano settimanale strutturato
- spiegazione sintetica
- warning
- variante piu' leggera

### 4. Esito Reale

Per esempio:

- piano accettato o no
- blocchi eseguiti
- blocchi saltati
- richieste di modifica

## Schema JSON Consigliato Per Dataset O Prompting

```json
{
  "user_profile": {
    "goals": [
      {
        "name": "Studio AI",
        "priority": 5,
        "desiredWeeklyMinutes": 300
      },
      {
        "name": "Fitness",
        "priority": 3,
        "desiredWeeklyMinutes": 180
      }
    ],
    "planningHorizon": "weekly",
    "fixedCommitments": [
      {
        "title": "Lavoro",
        "days": ["mon", "tue", "wed", "thu", "fri"],
        "start": "09:00",
        "end": "18:00"
      }
    ],
    "protectedTime": [
      {
        "title": "Mercoledi pomeriggio libero",
        "days": ["wed"],
        "start": "14:00",
        "end": "18:00"
      }
    ],
    "sleepWindow": {
      "wake": "07:00",
      "sleep": "23:30"
    },
    "energyProfile": {
      "morning": "high",
      "afternoon": "medium",
      "evening": "low"
    },
    "focusBlockMinutes": 60,
    "slotSizeMinutes": 30,
    "flexibilityMode": "mixed",
    "workStyle": "deep_work",
    "planIntensity": "balanced",
    "mainDifficulties": ["procrastination"],
    "selectedPreviewId": "balanced-anchor"
  },
  "derived_features": {
    "weeklyCapacityMinutes": 2640,
    "totalGoalMinutes": 480,
    "remainingWeeklyMinutes": 2160,
    "preferredFocusWindow": "morning",
    "workloadLevel": "light"
  },
  "planning_constraints": {
    "hard": [
      "sleep_must_be_preserved",
      "work_blocks_are_fixed",
      "protected_time_cannot_be_used"
    ],
    "soft": [
      "prefer_morning_for_focus",
      "prefer_60_minute_focus_blocks"
    ],
    "strategic": [
      "cover_priority_5_goals_first",
      "leave_some_buffer_if_possible"
    ]
  },
  "expected_output": {
    "strategy": "balanced",
    "blocks": [],
    "summary": [],
    "warnings": []
  }
}
```

## Cosa Dare A Un LLM E Cosa Non Dare

### Va Bene Dare A Un LLM

- profilo normalizzato
- feature derivate
- vincoli hard e soft gia' esplicitati
- bozza piano deterministica
- richiesta di spiegazione, raffinamento o variante

### Non E' Una Buona Idea Chiedere Al LLM Di Inventare Da Solo

- il tempo realmente disponibile
- i vincoli duri
- la durata del sonno necessaria
- la compatibilita' matematica del piano
- la validazione finale delle sovrapposizioni

Questa parte dovrebbe restare nel motore applicativo.

## Raccomandazione Franca Sul Tema Addestramento

Valutazione franca: l'idea di pensare da subito ai parametri per un LLM e' **forte**.

Pero' l'idea di "addestrare presto un LLM custom" e' solo **promettente ma da rifinire**.

Per questo prodotto il valore iniziale non nasce dal training, ma da:

1. schema dati molto pulito
2. motore deterministico affidabile
3. feedback loop ben tracciato
4. dataset proprietario raccolto nel tempo

La sequenza consigliata e' questa:

1. definire schema input e output stabile
2. costruire planner deterministico robusto
3. validare il planner locale con persone reali
4. salvare accettazioni, modifiche e fallimenti sul dispositivo
5. solo dopo valutare un'AI opzionale e il relativo modello di costo

## File Del Codice Da Tenere Allineati A Questo Documento

- [contracts.ts](/Users/lucaparlapiano/Develop/time_management_app/src/planner/contracts.ts)
- [defaults.ts](/Users/lucaparlapiano/Develop/time_management_app/src/planner/defaults.ts)
- [mockPlanner.ts](/Users/lucaparlapiano/Develop/time_management_app/src/planner/mockPlanner.ts)
- [NewUserWizardModal.tsx](/Users/lucaparlapiano/Develop/time_management_app/src/components/NewUserWizardModal.tsx)
- [schema-parametri-piano.md](/Users/lucaparlapiano/Develop/time_management_app/docs/schema-parametri-piano.md)
- [motore-flusso-pianificazione.md](/Users/lucaparlapiano/Develop/time_management_app/docs/motore-flusso-pianificazione.md)

## Conclusione

Se devi capire come creare o addestrare un LLM per questo progetto, la domanda giusta non e':

- "quale modello uso?"

Ma:

- "quale schema stabile usa il motore locale?"
- "quali decisioni restano spiegabili e verificabili?"
- "quali segnali locali aiutano a migliorare davvero?"

Questo file serve proprio come base di quella architettura dati.
