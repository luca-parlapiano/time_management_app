# Motore Di Pianificazione: Flusso Dalle Domande Al Piano

## Obiettivo

Definire come il motore deve trasformare le risposte dell'utente in un piano concreto, spiegabile e modificabile.

Il punto chiave e` questo:

- le domande non devono alimentare direttamente il modello AI
- prima devono costruire un profilo strutturato
- poi il profilo deve passare in una pipeline di pianificazione

## Principio Di Base

Il flusso corretto non e`:

`domande -> modello -> piano`

Il flusso corretto per un prodotto robusto e`:

`domande -> profilo normalizzato -> vincoli -> bozza deterministica -> raffinamento AI -> validazione -> piano finale`

Questo approccio evita piani incoerenti, troppo creativi o impossibili da eseguire.

## Flusso Completo

### Fase 1: Raccolta Risposte

L'utente compila l'onboarding iniziale.

Le risposte raccolte servono a identificare:

- obiettivi
- priorita`
- tempo disponibile
- impegni fissi
- energia
- preferenze di granularita`
- flessibilita`
- vincoli duri

Output della fase:

- `raw_answers`

Questa struttura deve restare vicina all'interfaccia e non essere usata direttamente per pianificare.

### Fase 2: Normalizzazione

Le risposte vengono convertite in uno schema coerente.

Esempi:

- "ho poco tempo durante la settimana" diventa minuti disponibili per giorno
- "preferisco lavorare la mattina" diventa profilo energetico
- "voglio allenarmi 3 volte" diventa target settimanale

Output della fase:

- `normalized_profile`

Questa fase serve a:

- ripulire i dati
- uniformare i formati
- risolvere ambiguita`
- applicare default sensati

### Fase 3: Feature Derivation

Dal profilo normalizzato il sistema calcola feature interne.

Esempi:

- capacita` settimanale totale
- saturazione per giorno
- finestre focus possibili
- tempo minimo per obiettivo
- rischio overload
- grado di rigidita` tollerabile

Output della fase:

- `derived_features`

Qui il motore inizia a ragionare non piu` come un questionario, ma come un sistema di allocazione del tempo.

### Fase 4: Constraint Building

Il sistema costruisce i vincoli della settimana.

Tipi di vincoli:

- hard constraints: sonno, lavoro, figli, appuntamenti fissi
- soft constraints: preferenze orarie, energia, stile di lavoro
- strategic constraints: priorita`, numero minimo di blocchi per obiettivo, buffer

Output della fase:

- `planning_constraints`

Questa e` una fase centrale, perche' separa:

- cio` che e` obbligatorio rispettare
- cio` che e` desiderabile ma negoziabile

### Fase 5: Generazione Bozza Deterministica

Qui non userei ancora il modello AI.

Il motore genera una prima bozza basata su regole:

1. blocca gli impegni fissi
2. rimuove sonno e indisponibilita`
3. calcola slot liberi
4. assegna gli obiettivi in base a priorita` e finestre compatibili
5. inserisce buffer minimi
6. lascia spazi di recupero se l'utente ha chiesto flessibilita`

Output della fase:

- `draft_plan`

Questa bozza deve essere gia` valida anche senza AI.

## Ruolo Del Modello AI

L'AI non dovrebbe essere il generatore primario del calendario.

Dovrebbe invece servire per:

- ordinare meglio i blocchi
- spiegare perche' il piano e` costruito cosi`
- suggerire alternative se il carico e` troppo alto
- adattare il tono e la motivazione al profilo utente
- proporre micro-modifiche intelligenti

Quindi il flusso giusto e`:

- il planner deterministico produce una base stabile
- il modello AI la raffina e la commenta

## Fase 6: Refinement AI

Input:

- `normalized_profile`
- `derived_features`
- `planning_constraints`
- `draft_plan`

Task del modello:

- riorganizzare alcuni slot entro limiti consentiti
- proporre una distribuzione piu` sostenibile
- segnalare conflitti o carichi eccessivi
- generare una spiegazione user-friendly
- produrre una o due varianti del piano

Output:

- `ai_plan_suggestions`

Importante: il modello non deve poter violare i vincoli hard.

## Fase 7: Validazione

Dopo il passaggio AI serve una validazione rigida lato applicazione.

Controlli minimi:

- nessuna sovrapposizione tra blocchi
- nessun blocco fuori dalle ore disponibili
- rispetto della granularita`
- rispetto di sonno e impegni fissi
- carico giornaliero entro soglie tollerabili
- copertura minima degli obiettivi principali

Output:

- `validated_plan`

Se il piano AI fallisce la validazione:

- si corregge automaticamente
- oppure si torna alla `draft_plan`

## Fase 8: Review Utente

L'utente non dovrebbe ricevere un piano come verita` assoluta.

Deve poter:

- accettarlo
- alleggerirlo
- renderlo piu` aggressivo
- spostare manualmente alcuni blocchi
- bloccare slot come preferiti o indesiderati

Questa fase e` importantissima per raccogliere segnali impliciti.

Output:

- `approved_plan`
- `user_adjustments`

## Fase 9: Esecuzione E Feedback

Durante la settimana il sistema osserva:

- blocchi completati
- blocchi saltati
- blocchi spostati
- ritardi
- giorni sovraccarichi
- giorni sottoutilizzati

Output:

- `execution_events`

Questi eventi servono a migliorare il profilo dinamico dell'utente.

## Fase 10: Replanning

Alla fine del giorno o della settimana il motore aggiorna il profilo e rigenera il piano successivo.

Esempi di apprendimento:

- se l'utente salta sempre i task serali, il sistema riduce quei blocchi
- se completa bene slot da 30 minuti, il sistema privilegia quella durata
- se i lunedi` sono sempre saturi, il motore sposta carico altrove

## Architettura A Oggetti Del Flusso

Una possibile struttura logica e`:

- `QuestionnaireService`
- `ProfileNormalizer`
- `FeatureDeriver`
- `ConstraintBuilder`
- `DeterministicPlanner`
- `AIPlannerAdapter`
- `PlanValidator`
- `PlanExplainer`
- `ExecutionTracker`
- `ReplanningService`

## Stato Minimo Del Motore

Il motore dovrebbe trattare il piano come una macchina a stati.

Stati utili:

- `draft`
- `ai_refined`
- `validated`
- `approved`
- `in_progress`
- `needs_replan`
- `archived`

Questo aiuta molto a gestire debugging, analytics e UX.

## Come Gestire Le Domande Nel Flusso

Le domande non devono essere tutte uguali. Le dividerei in tre gruppi.

### 1. Domande Di Base

Servono a costruire il profilo iniziale.

Esempi:

- cosa vuoi ottenere
- quante ore hai
- quali sono i tuoi impegni fissi
- quando hai piu` energia

### 2. Domande Di Disambiguazione

Si attivano solo se manca informazione utile.

Esempi:

- "vuoi un piano molto pieno o con margini?"
- "preferisci sessioni corte o lunghe?"
- "questo obiettivo e` quotidiano o settimanale?"

### 3. Domande Di Correzione

Entrano dopo la prima proposta.

Esempi:

- "il piano e` troppo intenso?"
- "quali blocchi non ti convincono?"
- "vuoi piu` flessibilita` il weekend?"

Questo significa che il questionario non e` un form statico, ma un dialogo guidato dal motore.

## Regola Molto Importante

Se una risposta puo` essere osservata nel comportamento futuro, non va chiesta in modo pesante all'inizio.

Per esempio:

- tolleranza ai task lunghi
- precisione nelle stime
- disciplina serale
- preferenza reale tra rigidita` e flessibilita`

Queste cose vanno apprese dai dati d'uso.

## Prima Versione Del Motore: Strategia Consigliata

Per l'MVP farei cosi`:

1. onboarding con 6-7 domande base
2. normalizzazione forte lato backend
3. planner deterministico che produce una settimana valida
4. modello AI che migliora spiegazione e ordine dei blocchi
5. review utente con 3 azioni semplici:
   - alleggerisci
   - bilancia
   - spingi
6. feedback loop giornaliero

## Decisione Di Progetto

La decisione piu` importante e` questa:

**il motore deve essere prima un allocatore affidabile di tempo, poi un sistema AI personalizzato.**

Se inverti questo ordine, rischi un'app affascinante ma poco affidabile.
