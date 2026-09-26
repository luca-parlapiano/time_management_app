# Stato del progetto

Rilevazione sul codice del 26 settembre 2026. [Indice documentazione](README.md).

## Implementato nel flusso principale

| Area | Disponibile |
| --- | --- |
| Calendario | Settimana corrente, navigazione, editor, spostamento manuale, eliminazione, controllo conflitti e vincoli protetti |
| Ricorrenze | Settimanali anche per attività flessibili, più giorni collegati, scadenza facoltativa, eccezioni e identità originale degli appuntamenti |
| Esiti | Superato, non superato, parziale, correzioni e storico mantenuto dopo eliminazione/svuotamento |
| Statistiche | Riepiloghi settimanali, panoramica annuale giornaliera e vista per attività; regole nel documento dei Provider |
| Dati | SQLite in worker, transazioni, revisioni, migrazione IndexedDB/localStorage v2, import/export JSON e copia precedente all’importazione |
| Personalizzazione | Profilo e obiettivi facoltativi, palette, icone, colori e copertine |

## Presente solo nel prototipo o nel laboratorio

Onboarding generativo, planner deterministico settimanale, simulatore, chat e runtime
LLM rimangono nel repository, ma non sono collegati al calendario principale. Gli
strumenti AI Lab non dimostrano da soli che esista un adapter addestrato e validato.

## Funzionalità proposte, non disponibili nel flusso principale

La [strategia di prodotto](strategia-prodotto-e-benchmark.md) propone una direzione
più ampia del calendario attuale. Restano da definire o implementare:

- timeline giornaliera dedicata, inbox e routine con sequenze di step;
- timer, reminder azionabili e misurazione della durata reale;
- ripianificazione assistita compatibile con date, vincoli ed esiti;
- apprendimento delle preferenze e ranking personale degli slot;
- eventuale AI con proposta, validazione, anteprima e conferma.

La vista calendario giorno/mese e il drag-and-drop non sono implementati. Le viste
annuali delle statistiche non sono viste mensili di modifica del calendario.
Account, sincronizzazione, mobile e cloud restano esclusi dall’attuale perimetro.

## Lavoro tecnico aperto

- Il canale `planner-ai:interpret` è ancora esposto dal preload e non verifica il
  mittente come i canali database. La chat disabilitata non disabilita il bridge.
  Prima di riutilizzarlo, allineare i controlli alle regole Electron del progetto.
- Il controllo conflitti privilegia correttezza su archivi personali; non è una
  validazione delle prestazioni su grandi quantità di serie ed eccezioni.
- La build compila il progetto, ma mancano script di packaging/installer nel manifest.
- Il vecchio piano v1, privo di date civili, non ha un assistente di conversione.

Questi punti sono un inventario del lavoro aperto, non nuove funzionalità approvate.

## Evidenze di verifica

Nella verifica del 26 settembre 2026 sono passati:

- `npm run lint`, senza warning;
- `npm run typecheck`;
- `npm test`: 56 test di calendario, archivio, utility e statistiche, 3 SQLite/worker e 5 della configurazione ESLint;
- `npm run build`, renderer ed Electron.

Il runtime Node ha emesso un avviso sull’API sperimentale SQLite. Le prove hanno usato
archivi temporanei, senza aprire il database reale dell’utente.

La verifica non includeva un avvio interattivo Electron, la suite browser dei Provider,
training/inferenza AI o una nuova verifica dei dati dei concorrenti. Le modalità di esecuzione sono nelle
[procedure di verifica](code-quality.md#procedure-di-verifica).

## Priorità e prossime decisioni

Questo è il riferimento unico per l’ordine proposto del lavoro. La sequenza non
costituisce approvazione delle funzionalità future.

1. Consolidare il calendario attuale con verifiche interattive di uso e recupero dati.
2. Confermare il segmento primario e intervistare cinque persone; verificare il valore
   del client desktop prima di considerare altri client o il cloud.
3. Scegliere il prossimo flusso: giornata, inbox o routine minima con 2–5 step.
   Confrontare checklist e timer, abitudini calendarizzate e flessibili, reminder utili
   e invasivi. Definire la prima giornata d’uso e i criteri di accettazione della scelta.
4. Definire le misure MVP: primo piano, prima routine completata, ritorno a sette giorni
   e reminder azionati, quando queste funzioni saranno disponibili.
5. Valutare la disponibilità a pagare per sync, desktop, AI o backup prima di estendere
   il perimetro. Riattivare planner o AI solo dopo aver verificato il bisogno.

Restano da rimandare social, challenge, gamification, coaching wellness, integrazioni
salute, automazioni complesse, ulteriori statistiche avanzate, sync bidirezionale,
account/cloud, backup remoto, mobile e smartwatch. L’AI autonoma che modifica il piano
senza conferma resta esclusa, non una funzionalità rinviata.

### Percorso AI condizionato alla validazione

Se viene confermata l’utilità dell’inserimento assistito:

1. Adattare `PlanningIntent` del prototipo al calendario corrente e definire
   `AIProposal` e `ProposalDiff` per anteprime verificabili.
2. Estendere il modello dati per proposte, modifiche e feedback mancanti, riutilizzando
   persistenza e storico già implementati.
3. Integrare la validazione deterministica di slot, vincoli, capacità e buffer;
   allineare anche i controlli IPC indicati nel lavoro tecnico aperto.
4. Provare il flusso con un piccolo modello locale senza adattamento specifico.
5. Preparare 50–100 scenari annotati per estrazione, domande mancanti e JSON valido.
6. Valutare un adapter LoRA solo se i risultati giustificano il training.
7. Introdurre ranking personale locale solo dopo aver raccolto esiti reali.

Motivazioni, parametri e metriche restano nella [proposta AI](ai-modello-personalizzazione-locale.md);
il posizionamento e le ipotesi di valore nella [strategia di prodotto](strategia-prodotto-e-benchmark.md).
