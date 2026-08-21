# Schema Parametri Utente Per La Generazione Del Piano

## Obiettivo

Definire il numero minimo di dati che l'utente deve inserire per ottenere un piano del tempo personalizzato, utile e sostenibile in un'app stile Habitify ma centrata sulla pianificazione a griglia e sul supporto di un modello AI remoto.

## Decisione Di Prodotto

Per un MVP credibile conviene usare:

- 10 parametri core obbligatori
- 4 parametri adattivi facoltativi ma molto utili
- 1 profilo dinamico aggiornato nel tempo dall'app

L'obiettivo non e` far compilare un questionario lungo, ma raccogliere abbastanza segnali da costruire un piano realistico gia` al primo utilizzo e poi migliorarlo con i dati d'uso.

## Parametri Core

| ID | Parametro | Tipo | Obbligatorio | Esempio | Impatto sul piano |
| --- | --- | --- | --- | --- | --- |
| P01 | Obiettivi principali | lista enumerata + testo breve | Si | "studio, fitness, lavoro profondo" | Definisce i bucket principali del tempo da allocare |
| P02 | Priorita` tra obiettivi | ranking o punteggio 1-5 | Si | "studio 5, fitness 3" | Decide cosa difendere quando il tempo non basta |
| P03 | Orizzonte del piano | enum | Si | giornaliero, settimanale | Cambia la logica di generazione e revisione |
| P04 | Impegni fissi | lista di blocchi temporali ricorrenti | Si | lavoro 09:00-18:00, lun-ven | Costruisce i vincoli duri della griglia |
| P05 | Disponibilita` reale residua | numero + distribuzione per giorno | Si | 2h lun-ven, 5h sab | Calcola il budget effettivo utilizzabile |
| P06 | Finestra sonno/veglia | orari | Si | sveglia 07:00, sonno 23:30 | Limita le ore schedulabili |
| P07 | Profilo energetico giornaliero | enum per fascia oraria | Si | alta mattina, bassa dopo pranzo | Assegna i task cognitivi nei momenti migliori |
| P08 | Granularita` preferita | enum | Si | 15, 30, 60 minuti | Definisce la risoluzione della griglia |
| P09 | Livello di flessibilita` desiderata | enum | Si | rigido, flessibile, misto | Determina quanti blocchi lasciare liberi o bufferizzati |
| P10 | Vincoli non negoziabili | lista testo + categoria | Si | figli, terapia, commute | Evita piani irrealistici o non accettabili |

## Parametri Adattivi

Questi parametri non devono essere obbligatori al primo minuto. Conviene mostrarli solo se rilevanti o in una seconda fase di onboarding.

| ID | Parametro | Tipo | Obbligatorio | Esempio | Impatto sul piano |
| --- | --- | --- | --- | --- | --- |
| P11 | Abitudini gia` consolidate | lista + frequenza | No | camminata 20 min ogni mattina | Aumenta continuita` e riduce attrito |
| P12 | Principali difficolta` | multi-select | No | procrastinazione, sovraccarico | Guida i suggerimenti del motore AI |
| P13 | Stile di lavoro preferito | enum | No | task lunghi, task brevi, alternanza | Influenza la forma dei blocchi |
| P14 | Modalita` di feedback | enum + frequenza | No | review serale, reminder smart | Definisce il loop di adattamento |

## Variabili Derivate Dall'App

L'utente non deve compilare tutto. Molte variabili possono essere dedotte internamente:

- capacita` pianificabile settimanale
- saturazione media per giorno
- compatibilita` tra obiettivi e tempo disponibile
- finestre ottimali per focus work
- rischio overload
- tolleranza al cambiamento di routine
- stabilita` delle abitudini
- tasso di completamento dei blocchi
- accuratezza della stima dei task
- fasce orarie ad alta riuscita
- pattern di rinvio o skip
- bisogno di buffer automatici

In questo modo un onboarding da 10-14 risposte puo` generare 25-40 feature utili al motore di pianificazione.

## Numero Consigliato Di Domande Nell'Onboarding

### Versione MVP

- 6-7 domande iniziali obbligatorie
- 3 domande contestuali mostrate solo se servono
- 1 review guidata del piano generato

### Versione Più Evoluta

- onboarding adattivo a step
- profilazione progressiva dopo 3-7 giorni di utilizzo
- affinamento automatico tramite comportamento osservato

## Come Il Motore Dovrebbe Usare Questi Parametri

Il sistema non dovrebbe affidarsi solo a un modello generativo. La soluzione piu` robusta per il primo rilascio e` ibrida:

1. un motore deterministico costruisce la griglia temporale
2. un layer di regole applica vincoli, priorita` e buffer
3. il modello AI remoto propone distribuzione, micro-aggiustamenti e spiegazioni
4. un ciclo di feedback corregge il piano in base all'esecuzione reale

### Output Atteso Del Motore

Dato il profilo utente, il sistema dovrebbe produrre:

- piano settimanale su griglia
- suggerimento dei blocchi focus/routine/recupero
- motivazione sintetica delle scelte
- margini di flessibilita`
- alternativa in caso di giornata saltata

## Implicazioni Per Il Modello AI

Per questo prodotto il problema principale non e` "predire" genericamente il comportamento umano, ma allocare tempo rispettando vincoli personali. Per questo motivo:

- Kaggle non dovrebbe essere la base principale del modello
- un dataset pubblico puo` aiutare nella ricerca iniziale, non nel cuore del prodotto
- il vero valore arrivera` dai dati proprietari raccolti nell'app

### Dove Un Dataset Pubblico Puo` Essere Utile

- validare categorie di routine e time blocking
- fare analisi esplorativa su pattern generali
- generare esempi sintetici di utenti
- testare metriche o segmentazioni iniziali

### Dove Non Basta

- preferenze individuali
- vincoli personali reali
- dinamica energia-stanchezza del singolo utente
- adattamento alla settimana concreta dell'utente

## Raccomandazione Tecnica Iniziale Sul Modello

Per il primo MVP:

- niente training custom complesso all'inizio
- usare un modello remoto come planner/reasoner
- serializzare il profilo utente in uno schema stabile
- far generare al modello una proposta strutturata in JSON
- validare il JSON con regole locali prima di mostrarlo

In pratica il "cervello" del piano dovrebbe essere:

- 60-70% logica applicativa
- 20-30% personalizzazione AI
- 10% apprendimento dai dati storici dell'utente

## Schema JSON Minimo Del Profilo Utente

```json
{
  "goals": [
    { "name": "studio", "priority": 5 },
    { "name": "fitness", "priority": 3 }
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
  "availableTimeByDay": {
    "mon": 120,
    "tue": 120,
    "wed": 90,
    "thu": 120,
    "fri": 60,
    "sat": 240,
    "sun": 180
  },
  "sleepWindow": {
    "wake": "07:00",
    "sleep": "23:30"
  },
  "energyProfile": {
    "morning": "high",
    "afternoon": "medium",
    "evening": "low"
  },
  "slotSizeMinutes": 30,
  "flexibilityMode": "mixed",
  "hardConstraints": ["commute", "family_time"],
  "existingHabits": ["morning_walk"],
  "mainDifficulties": ["procrastination"],
  "workStyle": "deep_work",
  "feedbackMode": "daily_review"
}
```

## Conclusione

La soglia giusta per partire e` far inserire all'utente 10 parametri core e raccogliere gli altri in modo progressivo. Questo permette di avere un onboarding leggero, un piano gia` utile al primo tentativo e una base tecnica solida per progettare lo stack Expo + backend + AI remoto.
