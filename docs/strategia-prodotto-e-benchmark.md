# Strategia Prodotto E Benchmark

> **Direzione di prodotto e ipotesi da validare.** Questa pagina non è l’elenco delle
> funzionalità implementate. Vedi [stato del progetto](stato-progetto.md) e [indice](README.md).
> I dati e le caratteristiche dei concorrenti non sono stati rivalidati nel
> riallineamento del 26 settembre 2026; non considerarli un benchmark aggiornato.

## Stato Delle Evidenze

Questo documento usa documentazione ufficiale, store e recensioni pubbliche.
I download globali dichiarati dai produttori e i temi nelle review sono segnali, non una ricerca di mercato conclusiva.

## Direzione Consigliata

L'app non deve essere un task manager generico ne' la somma di cinque concorrenti.

> Un daily planner visuale che trasforma le abitudini in blocchi realistici della giornata, le accompagna nell'esecuzione e aiuta a ripartire quando il piano salta.

Promessa del prodotto: **Pianifica la tua giornata e costruisci routine che riesci davvero a seguire.**

Categoria primaria: **daily planner con habit tracking**.

Categorie adiacenti: time blocking, routine builder, focus timer ed executive-function support.

Il design puo' essere ADHD-friendly senza fare promesse cliniche o terapeutiche.

## Utente Iniziale

| Segmento | Bisogno dominante |
| --- | --- |
| Studente | Sessioni, esami, routine e prezzo accessibile |
| Lavoratore al PC | Calendario, desktop, reminder e continuita' del piano |
| Utente ADHD o con difficolta' di focus | Meno overload, prossimo passo chiaro e ripianificazione gentile |

Segmento primario consigliato: **studente universitario o knowledge-worker che passa parte della giornata al PC, pianifica spesso ma perde focus o routine personali**.

L'ADHD e' una lente di design utile a tutti, non una terza app separata.

## Ipotesi iniziali su ciò che gli utenti apprezzano

Questa non e' una classifica statistica delle preferenze.

Riunisce recensioni pubbliche, documentazione dei concorrenti e richieste ricorrenti.

"Forte" indica un tema presente sia nelle recensioni sia nel posizionamento dei prodotti.

| Tema | Evidenza osservata | Confidenza | Implicazione MVP |
| --- | --- | --- | --- |
| Giornata visibile | Timeline e review citano meno ansia e maggiore chiarezza | Forte | Timeline quotidiana come home |
| Inserimento veloce | Inbox, brain dump, template e shortcut sono ricorrenti | Forte | Crea task da home, inbox e shortcut |
| Routine ricorrenti | Sono primarie in Structured, Habitify e Routinery | Forte | Routine con frequenza, durata e step |
| Reminder azionabili | Orario, luogo, stacking e reminder ripetuti risolvono l'avvio | Forte | Completa, rinvia, salta, avvia |
| Piano saltato | Replan, skip e modifica del piano risolvono la stessa frizione | Forte | Replan manuale prima di automazioni |
| Timer per step | Tiimo e Routinery riducono il passaggio tra azioni | Media | Validare timer contro semplice check-off |
| Sync e continuita' | I problemi di sync vengono segnalati immediatamente nelle review | Forte | Dati locali affidabili ora; sync solo dopo validazione |
| Progresso visibile | Streak e completamento sono leve comuni nei tracker | Media | Vista settimanale prima di analytics |
| Personalizzazione | Colori, icone e layout sono centrali in Structured e Tiimo | Media | Personalizzazione leggera |

### Limiti Di Questa Sezione

- I dati Google Play sono soglie pubbliche, non download esatti o globali.
- I numeri globali dichiarati dai produttori non sono stati verificati in modo indipendente.
- Le review lette non sostituiscono un'analisi codificata di centinaia di recensioni.
- Non sappiamo ancora quali feature generino retention o disponibilita' a pagare.

### Dati E Frizioni Per Concorrente

**Structured**

- Punto apprezzato: timeline, inbox, Replan e pianificazione per energia.
- Frizioni visibili: travel time, rischedulazione di blocchi sovrapposti, limiti del free tier e parita' Android/Web.
- Google Play: `1M+` installazioni, rating `4.5`, circa `30.8K` recensioni.
- Dichiarazione del produttore: `15M+` download totali e `500K+` utenti Pro.

**Tiimo**

- Punto apprezzato: planner visuale, timer, checklist, colori e supporto al focus.
- Frizioni visibili: sync calendario, feature non identiche su tutte le piattaforme e limiti del watch.
- App Store: rating `4.6` e circa `18K` rating.
- Dichiarazione del produttore: `3M+` download globali.

**Habitify**

- Punto apprezzato: reminder a orario, posizione e habit stacking, integrazioni e Windows/Wear OS.
- Frizioni visibili: piano gratuito limitato e reminder ritardati da sistemi di risparmio batteria.
- Google Play: `500K+` installazioni, rating `4.2`, circa `6.6K` recensioni.
- Dichiarazione del produttore: `3M+` utenti.

**Routinery**

- Punto apprezzato: voce, timer step-by-step, pausa, skip e tempi realistici delle routine.
- Frizioni visibili: bisogno di ricorrenze flessibili e di una vista meno affollata.
- Google Play: `1M+` installazioni, rating `4.5`, circa `18.4K` recensioni.
- Dichiarazione del produttore: `5M+` utenti globali.

**TickTick**

- Punto apprezzato: task, calendario, habit, Pomodoro, reminder e copertura desktop.
- Frizione utile: molte funzioni possono rendere il prodotto complesso da mantenere.
- Google Play: `10M+` installazioni, rating `4.6`, circa `163K` recensioni.

**Competitor adiacenti**

- Fabulous: `10M+` Android e circa `589K` recensioni; e' wellness/coaching piu' che planner.
- Habitica: `5M+` Android e circa `75K` recensioni; valida gioco e community, non una UX calma e visuale.

### Frizioni Da Evitare

- reminder inaffidabili, troppo aggressivi o poco configurabili;
- sync fragile, ritardato o diverso tra dispositivi;
- ricorrenze insufficienti per la vita reale;
- piano rigido che punisce chi salta un'attivita';
- funzioni fondamentali nascoste dietro paywall;
- app che richiede di mantenere il sistema invece di aiutare l'utente.

## Benchmark

| App | Punto di forza | Limite utile per noi | AI |
| --- | --- | --- | --- |
| Structured | Timeline, inbox, task ricorrenti e Replan | Replan e AI non sono paritari su Android/Web | Piani da linguaggio naturale |
| Tiimo | Timeline, timer, checklist e UX per focus | Calendario principalmente importato a senso unico | Brain dump, step e stime |
| Habitify | Habit, reminder, watch, Windows e integrazioni | Non ha timeline giornaliera come cuore | Connessione a tool AI esterni |
| Routinery | Timer per step, voce, pausa e skip | Planner libero e Windows non sono il centro | Suggerimenti e routine via AI/MCP |
| TickTick | Client Windows, calendario, reminder e sync | Task manager ampio e complesso | Cattura vocale e automazioni |

**Structured** e' il concorrente piu' diretto sul prodotto.

Nessun concorrente combina bene timeline visuale, habit tracking profondo, Windows nativo, Android, Wear OS e routine passo-passo.

Questa e' un'opportunita', non la prova che esista gia' domanda pagante.

## Flusso Interno Fondamentale

Il valore non e' mettere task e habit in due sezioni.

```text
Intento o abitudine
  -> routine con durata e frequenza
  -> blocco proposto nella timeline di oggi
  -> reminder azionabile
  -> avvio / completa / rinvia / salta
  -> storico di esecuzione
  -> proposta migliore per la prossima giornata
```

Oggetti da tenere distinti:

- **Task:** attivita' singola o progetto con scadenza.
- **Habit:** comportamento da ripetere e misurare nel tempo.
- **Routine:** sequenza ordinata di task o habit con durata.
- **Plan block:** istanza collocata in un orario della timeline.
- **Execution event:** avvio, completamento, rinvio, skip, durata reale.

Questa separazione evita di ridurre l'abitudine a un task ricorrente e rende possibile imparare dall'esecuzione reale.

## MVP

### Perimetro MVP proposto

- timeline del giorno;
- inbox per task e idee;
- task e abitudini ricorrenti nello stesso calendario;
- routine con 2-5 step, durata stimata e avvio manuale;
- persistenza del piano e dello storico sullo stesso desktop;
- esecuzione locale con completa, rinvia e salta;
- cronologia base e ripianificazione manuale;
- motore deterministico locale, senza inviare dati a servizi AI.

Le ipotesi da verificare, le esclusioni e l’ordine delle decisioni sono nello
[stato del progetto](stato-progetto.md#priorità-e-prossime-decisioni).

## AI: Assistente Opzionale, Non Planner

Nella prima release l'AI non e' una feature attiva. Il valore del prodotto deve reggere
anche con connessione assente: profilo, piano, routine, storico e ripianificazione restano
locali, deterministici e spiegabili.

Se in futuro verra' introdotta, l'AI avra' un solo ruolo: **ridurre il lavoro di traduzione
tra cio' che l'utente scrive e cio' che il motore puo' pianificare**. Non decide per la
persona, non diventa il proprietario del calendario e non e' la promessa commerciale.

Usi consentiti, confini e flusso proposta → validazione → anteprima → conferma
sono definiti nella [proposta AI](ai-modello-personalizzazione-locale.md#flusso-sicuro).

L’integrazione resta subordinata alla validazione del bisogno descritta nelle
[priorità del progetto](stato-progetto.md#priorità-e-prossime-decisioni).

## Coerenza con l’app corrente

Il calendario attuale copre pianificazione manuale settimanale, ricorrenze, vincoli,
esiti, statistiche e backup locali. Il precedente onboarding generativo e il simulatore
rimangono nel repository, scollegati dalla home.

La direzione proposta in questo documento richiede ancora timeline del giorno, inbox,
routine a step ed esecuzione guidata. Le ricorrenze del calendario non costituiscono da
sole un modello completo di habit e routine. Prima di estendere AI o simulazione va
definito quale di questi flussi serva all’utente iniziale.

Persistenza, storico, import/export e statistiche di base sono già implementati:
non sono più attività da avviare da zero. Le proposte sopra non sono un backlog interamente aperto.

## Fonti

- [Structured: disponibilita'](https://help.structured.app/en/articles/324738)
- [Structured: Replan](https://help.structured.app/en/articles/4511874)
- [Tiimo: prodotto e AI](https://www.tiimoapp.com/)
- [Tiimo: FAQ](https://www.tiimoapp.com/faq)
- [Habitify: reminder](https://intercom.help/habitify-app/en/articles/12396874-good-habit-setting-reminders)
- [Habitify: abitudini su desktop](https://intercom.help/habitify-app/en/articles/11203157-add-a-new-habit-on-website-desktop-app)
- [Routinery: AI e timeline](https://www.routinery.app/updatenote/3-29-24)
- [TickTick: funzionalita'](https://ticktick.com/features)
- [TickTick: Windows](https://ticktick.com/windows)
