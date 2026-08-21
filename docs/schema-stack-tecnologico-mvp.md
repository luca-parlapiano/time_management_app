# Schema Stack Tecnologico MVP

## Obiettivo

Progettare uno stack realistico per un'app di time management assistita da AI, con pianificazione a griglia, onboarding guidato e generazione remota del piano personalizzato.

## Vincolo Chiave Di Piattaforma

Expo e` una scelta molto forte per:

- iOS
- Android
- Web

Non e` invece la scelta piu` lineare per coprire nativamente, con lo stesso flusso, anche:

- Windows desktop
- macOS desktop
- Linux desktop

Per questo motivo il punto da decidere subito non e` solo "usiamo Expo?", ma:

**vogliamo una vera app desktop nativa oppure una web app molto ben fatta accessibile da desktop?**

## Raccomandazione Per L'MVP

La scelta piu` solida per partire e`:

- **Expo + React Native** per iOS e Android
- **Expo Web** per browser desktop e mobile
- **PWA** come esperienza desktop iniziale per macOS, Windows e Linux

Questa strada massimizza la riusabilita` del codice e minimizza la complessita` iniziale.

## Perche' Questa Scelta Ha Senso

- consente un'unica codebase di prodotto
- accelera il design system e il testing
- permette di validare subito il motore di pianificazione
- evita di aprire troppo presto il fronte native desktop
- rende piu` semplice iterare sul modello AI e sulla UX di onboarding

## Quando Servirebbe Una Vera App Desktop

Una shell desktop dedicata avrebbe senso se in futuro ti servono:

- lavoro offline forte
- notifiche desktop evolute
- system tray
- global shortcuts
- integrazione file system locale
- finestre multiple

In quel caso la seconda fase piu` sensata sarebbe una shell desktop separata, non il tentativo di forzare Expo a coprire tutto da solo.

## Stack Consigliato

### Frontend

- Expo
- React Native
- TypeScript
- Expo Router
- React Query o TanStack Query
- Zustand per stato locale leggero
- React Hook Form + Zod per onboarding e validazione

### UI E Pianificazione

- calendario/griglia custom a slot da 15/30/60 minuti
- componenti condivisi mobile/web
- logica di drag, resize e rescheduling nel layer applicativo
- supporto progressivo a gesture su mobile e interazioni mouse su web

### Backend

- NestJS oppure Fastify con TypeScript
- API REST nel primo rilascio
- job queue per generazione piano e ricalcolo asincrono

Per l'MVP consiglierei **Fastify + TypeScript** se vuoi restare snello e veloce.

### Database

- PostgreSQL come database principale
- Redis per cache, lock e job queue

### Autenticazione

- Supabase Auth oppure Clerk

Per il primo MVP, **Supabase** e` molto comodo per partire rapidamente.

### AI Layer

- servizio backend separato chiamato `planner-service`
- prompt engineering + output JSON strutturato
- validazione server-side dello schema di piano
- fallback a regole deterministiche se l'output AI non e` valido

### Storage E Telemetria

- object storage per export e backup del piano
- analytics eventi per onboarding, completamento task, skip, replan
- logging applicativo con Sentry

## Architettura Logica Del Motore

### 1. Profilo Utente

Raccoglie i 10-14 parametri definiti nel documento dei requisiti.

### 2. Constraint Engine

Applica:

- impegni fissi
- sonno
- vincoli non negoziabili
- tempo residuo
- granularita` della griglia

### 3. Planning Engine

Genera una bozza iniziale di distribuzione del tempo.

### 4. AI Planner

Migliora la proposta con:

- ordine dei blocchi
- motivazioni
- alternative
- suggerimenti di buffer

### 5. Feedback Loop

Aggiorna il profilo in base a:

- task completati
- ritardi
- skip
- spostamenti manuali

## Modello Dati Principale

Entita` da prevedere subito:

- user
- user_profile
- goal
- recurring_commitment
- planning_rule
- weekly_plan
- plan_block
- habit
- execution_log
- feedback_event
- ai_plan_request
- ai_plan_response

## Flusso Principale Utente

1. onboarding iniziale
2. costruzione del profilo
3. generazione del primo piano
4. review utente del piano
5. esecuzione durante la settimana
6. raccolta segnali comportamentali
7. ripianificazione automatica o assistita

## Strategia Sul Modello AI

Per il primo rilascio non consiglierei un modello proprietario addestrato da zero. La sequenza piu` pragmatica e`:

1. motore ibrido regole + modello remoto
2. raccolta dataset proprietario di utilizzo
3. analisi dei pattern migliori/peggiori
4. eventuale fine-tuning o ranking model in una fase successiva

## Kaggle: Decisione Pratica

Userei Kaggle o dataset pubblici solo per:

- benchmark iniziali
- simulazioni
- generazione di personas sintetiche
- testing delle euristiche

Non lo userei come fondazione del planner personalizzato, perche' il valore reale dipende dai dati situazionali del singolo utente.

## Scelta Architetturale Consigliata

### MVP Fase 1

- Expo mobile
- Expo web
- backend TypeScript
- PostgreSQL
- Redis
- planner ibrido regole + AI remoto

### Fase 2

- PWA ottimizzata desktop
- notifiche avanzate
- sync piu` sofisticato
- analytics per personalizzazione

### Fase 3

- eventuale desktop wrapper dedicato
- eventuale modello proprietario specializzato

## Decisione Finale Consigliata

Se l'obiettivo e` validare velocemente il prodotto, la scelta migliore oggi e`:

**Expo per iOS/Android/Web, desktop coperto inizialmente via web/PWA, planner ibrido lato backend, nessun training custom pesante nella fase 1.**
