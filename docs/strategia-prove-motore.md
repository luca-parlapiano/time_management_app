# Strategia Di Prove Per Il Motore

## Obiettivo

Costruire e testare il motore di pianificazione prima dell'app, in modo da validare la logica di allocazione del tempo senza dipendere da interfaccia, autenticazione o modello AI.

## Principio Chiave

Le prove del motore non dovrebbero chiedere:

- "il piano e` esattamente questo?"

Dovrebbero chiedere:

- "il piano rispetta i vincoli?"
- "il carico e` sostenibile?"
- "gli obiettivi prioritari ricevono abbastanza spazio?"
- "la griglia prodotta e` coerente?"

Per un planner ci possono essere piu` output validi. Per questo conviene testare **invarianti**, non solo output identici.

## Flusso Di Lavoro Consigliato

### Fase 1

Definire i contratti:

- `UserProfile`
- `WeeklyPlan`

### Fase 2

Preparare 3-5 profili sintetici realistici.

### Fase 3

Per ogni profilo scrivere aspettative verificabili:

- nessun overlap
- rispetto di sonno e lavoro
- massimo carico giornaliero
- minima copertura dei goal
- presenza di buffer se richiesti

### Fase 4

Implementare il motore in moduli piccoli:

- normalizer
- constraint builder
- deterministic planner
- validator

### Fase 5

Solo dopo collegare il layer AI.

## Tipi Di Test Da Fare

### 1. Contract Tests

Verificano che input e output rispettino gli schemi JSON.

Servono per:

- evitare dati incoerenti
- rendere stabile il backend
- rendere sostituibile il planner AI

### 2. Unit Tests

Da usare sui moduli deterministici.

Esempi:

- conversione delle risposte in minuti
- calcolo slot disponibili
- costruzione vincoli hard e soft
- controllo saturazione giornaliera

### 3. Scenario Tests

Sono i piu` importanti all'inizio.

Per ogni profilo sintetico:

- carichi il profilo
- esegui il planner
- controlli un set di regole attese

Questi test sono ottimi perche' rappresentano casi d'uso reali.

### 4. Regression Tests

Ogni volta che trovi un comportamento sbagliato, crei uno scenario dedicato e lo conservi.

Questo impedisce al motore di "rompersi" in silenzio mentre evolvi la logica.

### 5. AI Guardrail Tests

Quando introdurrai il modello AI, non testerai se "ragiona bene" in astratto, ma se:

- restituisce JSON valido
- non viola i vincoli hard
- non crea overload e sovrapposizioni
- non sposta blocchi fuori dalle finestre disponibili

## Come Fare Le Prime Prove Senza App

Il modo migliore per iniziare e` un piccolo harness standalone:

1. carica un profilo JSON
2. passa il profilo al planner deterministico
3. genera un `WeeklyPlan`
4. valida il piano
5. stampa un report leggibile

Il report dovrebbe dirti almeno:

- minuti pianificati per goal
- saturazione per giorno
- slot liberi residui
- eventuali violazioni

## Criteri Di Successo Minimi Del Planner V1

Prima di integrare AI o UI, il planner dovrebbe superare questi controlli:

- nessun overlap
- nessun blocco fuori finestra disponibile
- sonno rispettato
- impegni fissi rispettati
- granularita` corretta
- almeno un'allocazione per ogni goal prioritario
- carico giornaliero non eccessivo
- presenza di buffer se `flexibilityMode` non e` rigido

## Come Valutare Se Il Piano E` "Buono"

Un piano puo` essere formalmente valido ma scarso.

Per questo conviene avere anche metriche qualitative trasformate in score:

- `goalCoverageScore`
- `energyAlignmentScore`
- `dailyBalanceScore`
- `bufferScore`
- `overloadRiskScore`

Questi score non sostituiscono i test, ma aiutano a confrontare due versioni del planner.

## Roadmap Tecnica Del Motore

### Step 1

Contratti JSON e scenari.

### Step 2

Validator del piano.

### Step 3

Planner deterministico minimale:

- blocca impegni
- trova slot
- assegna goal per priorita`

### Step 4

Planner deterministico migliorato:

- energia
- buffer
- obiettivi con frequenza
- riequilibrio dei giorni

### Step 5

Layer AI di raffinamento e spiegazione.

## Decisione Consigliata

Se vuoi costruire bene il motore, non partire dalla UI e non partire dall'AI.

Parti da:

- schemi dati stabili
- scenari realistici
- planner deterministico testabile
- validator severo

L'AI entrera` dopo come acceleratore, non come fondazione.
