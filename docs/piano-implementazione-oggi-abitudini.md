# Piano di implementazione: Oggi e Abitudini

> Proposta operativa del 29 settembre 2026. Descrive lavoro da realizzare, non
> funzionalità già disponibili. Lo [stato del progetto](stato-progetto.md) resta il
> riferimento per ciò che è implementato; la
> [strategia](strategia-prodotto-e-benchmark.md) spiega la direzione di prodotto.

## Stato di avanzamento

La prima tranche è implementata: modello e persistenza delle abitudini, migrazione
SQLite v1→v2, compatibilità dei backup precedenti, creazione di un piano settimanale
con giorni/orario/durata, dashboard Oggi e percorso recente in Abitudini. Restano da
realizzare modifica del piano con decorrenza, pausa/ripresa, occasioni senza orario,
client mobile, sincronizzazione e promemoria.

**Da implementare:** l'occasione autonoma generata dal piano, inizialmente «da
collocare», e le notifiche facoltative che suggeriscono uno spazio compatibile.
Oggi la creazione di un'abitudine richiede un orario e inserisce direttamente serie
nel Calendario. Non interpretare questi eventi come la versione finale delle
occasioni. Nel frattempo una collisione con un evento esistente non lo sostituisce:
il salvataggio fallisce senza modifiche e l'utente deve scegliere un altro orario
o giorno. Il Calendario costituisce la base degli impegni da rispettare.

## Risultato atteso

L'utente definisce un'abitudine e un piano praticabile, trova nella dashboard **Oggi**
le occasioni della giornata, registra l'esito e segue nel tempo il percorso nella
sezione **Abitudini**. Quando il piano non funziona, può modificarlo mantenendo la
storia precedente. **Calendario** continua a gestire gli orari e gli altri impegni.

Esempio di riferimento: «Leggere 20 minuti il lunedì, mercoledì e venerdì alle 21».
La prima versione deve permettere di crearla, vedere le tre occasioni nelle rispettive
giornate, spostarne una, registrarla come completata/parziale/saltata e distinguere
il piano precedente dopo un cambio di frequenza o orario.

## Decisioni di modello da fissare prima della UI

| Entità | Responsabilità | Identità stabile |
| --- | --- | --- |
| Abitudine | Nome, aspetto, durata proposta, stato e piano corrente | `habitId` |
| Piano | Frequenza, giorni, eventuale orario e data di entrata in vigore; le modifiche non riscrivono le occasioni passate | `planId` o revisione del piano |
| Occasione | Una possibilità prevista di praticare l'abitudine; può essere collocata nel calendario | Chiave composta da piano, serie e data originale |
| Esito | Registrazione o correzione riferita a una sola occasione | ID del record; chiave dell'occasione per deduplicare |

`activityId` identifica già gruppi di appuntamenti ricorrenti: non va riutilizzato
come `habitId`. Collegare esplicitamente gli appuntamenti di calendario all'abitudine.
Conservare la data originale dell'occasione quando viene spostata, come avviene oggi
per le ricorrenze. Gli esiti già registrati restano consultabili anche se l'occasione
o l'abitudine viene archiviata. «Senza esito» è distinto da «saltata»; le occasioni
future non sono progressi registrati.

Il modello deve consentire in futuro piani senza orario e obiettivi come «tre volte
alla settimana». La prima consegna usa giorni settimanali e orario esplicito, perché
questo è il flusso sostenuto dalle ricorrenze attuali. Le due modalità future non
devono essere simulate con un orario fittizio.

## Fasi di consegna

### 0. Baseline e contratti

- Verificare in modo interattivo apertura, salvataggio, correzione degli esiti e
  recupero/importazione di un backup su archivi di prova.
- Definire invarianti e casi limite: creazione da zero, serie multi-giorno, cambio
  piano, spostamento, pausa/ripresa, cancellazione e correzioni. Fissare la semantica
  di «pausa»: nessuna nuova occasione durante l'intervallo di pausa; lo storico resta.
- Documentare la politica di modifica del piano: un nuovo piano parte da una data
  scelta, preserva le occasioni e gli esiti precedenti e non genera doppioni alla
  data di passaggio.

**Uscita:** esempi di input/output e casi di accettazione condivisi dal dominio alla UI.

### 1. Persistenza e dominio delle abitudini

- Introdurre tipi in `src/model`, funzioni pure in `src/domain` e operazioni nel
  `DBProvider`. Le schermate useranno `useDB`, senza accedere a SQLite o IPC.
- Salvare le abitudini nello snapshot confermato, insieme ai collegamenti agli
  appuntamenti e allo storico. Estendere lo schema SQLite nel worker con una
  migrazione transazionale basata su `PRAGMA user_version`; non usare il database
  reale dell'utente nei test.
- Versionare il backup e offrire una conversione **esplicita e validata** dei backup
  attuali. Mantenere importabili i backup precedenti e preservare `previousImport`.
  Un archivio sconosciuto o corrotto deve produrre un errore, mai uno stato vuoto.
- Riutilizzare l'espansione delle ricorrenze quando l'occasione ha un orario;
  mantenere l'identità originale dopo uno spostamento. Definire il comportamento
  di un singolo salvataggio che aggiorna abitudine, piano e calendario insieme:
  controllo conflitti e revisione devono fallire senza scritture parziali.
- Calcolare progresso e timeline dal piano e dagli esiti confermati. Evitare totali
  derivati salvati. Tenere separate le regole della vista Abitudini dalle formule
  esistenti delle Statistiche.

**Uscita:** creare e modificare un'abitudine tramite il Provider, chiudere e riaprire
l'app, esportare/importare e ritrovare piano ed esiti invariati.

### 2. Schermata Abitudini: il percorso nel tempo

- Aggiungere la sezione prima del Calendario, con lista delle abitudini e creazione
  guidata: comportamento, giorni, orario, durata, aspetto. Mostrare subito la
  prossima occasione prevista.
- Nel dettaglio, mostrare una timeline in ordine temporale di occasioni ed esiti,
  con data, stato, eventuale spostamento e variazioni di piano. Usare la linea e i
  nodi dell'immagine di riferimento come principio visivo; mantenere leggibili
  testi, contrasto e navigazione da tastiera. La timeline deve essere paginata o
  limitata a intervalli: le serie senza scadenza non si espandono all'infinito.
- Permettere modifica del piano con data di decorrenza, pausa/ripresa e correzione
  di un esito. Mostrare avanzamento rispetto alle occasioni previste nel periodo,
  con conteggi distinti per completate, parziali, saltate e da registrare. Nessuna
  promessa del tipo «abitudine formata dopo N giorni».

**Uscita:** l'utente capisce cosa ha previsto, cosa è successo e cosa cambierà con
il nuovo piano, senza perdere la storia.

### 3. Dashboard Oggi e integrazione con Calendario

- Aggiungere `Oggi` come schermata iniziale: prossimo passo, timeline verticale
  della giornata, indicatore dell'ora attuale e azioni rapide sugli esiti. Gli altri
  impegni restano visibili perché occupano tempo reale.
- Le occasioni delle abitudini con orario compaiono una sola volta sia in Oggi sia
  nel Calendario. Spostamento e correzione devono aggiornare entrambe le viste e
  il dettaglio dell'abitudine dopo la conferma del salvataggio.
- Conservare un collegamento diretto dall'occasione in Oggi alla sua storia in
  Abitudini. Usare il loading locale e presentare gli errori accanto all'azione.
- Su schermi stretti verificare leggibilità, azioni toccabili e navigazione. La
  disposizione mobile definitiva verrà definita con il client mobile, mantenendo
  Oggi e Abitudini immediatamente raggiungibili.

**Uscita:** il ciclo «pianifico → pratico → registro → osservo → adatto» funziona
senza dover ricopiare dati tra schermate.

### 4. Occasioni senza orario e client mobile

- Aggiungere giorni scelti senza orario: in Oggi stanno in «Da collocare» e
  diventano blocchi temporali solo quando l'utente assegna un orario. Spostarle
  non crea una seconda occasione o un secondo esito.
- Aggiungere poi obiettivi settimanali liberi e momenti descrittivi come «dopo
  colazione», definendo prima le regole di attribuzione a settimana, pausa e
  ripianificazione. Evitare che una frequenza settimanale diventi un obbligo ogni giorno.
- Per il client mobile, riutilizzare contratti e regole di dominio, con persistenza
  locale adatta alla piattaforma. Progettare la sincronizzazione come fase dedicata:
  revisioni SQLite e ordine dello storico funzionano oggi nella singola installazione,
  ma non risolvono conflitti tra due dispositivi offline. Definire identità, ordine
  delle correzioni e risoluzione dei conflitti prima di collegare i client.
- Promemoria facoltativi solo dopo aver verificato la qualità del flusso manuale;
  una notifica deve riferirsi all'occasione corretta e offrire un'azione utile.

**Uscita:** abitudini flessibili coerenti con la timeline; successivamente,
client mobile utilizzabile offline e sincronizzazione verificata separatamente.

## Verifiche e criteri di accettazione del primo rilascio

Il primo rilascio comprende le fasi 0–3. Va considerato pronto quando:

1. Una nuova abitudine programmata su più giorni crea le occasioni attese, senza
   duplicati, e un conflitto di calendario lascia lo stato invariato.
2. Registrare o correggere un esito aggiorna Oggi, Calendario e Abitudini dopo il
   salvataggio. Il progresso deduplica le correzioni; futuro e assenza di esito
   restano distinti da «saltata».
3. Spostare un'occasione conserva la sua identità; cambiare il piano non riscrive
   gli esiti precedenti né genera occasioni duplicate. Pausa e ripresa funzionano
   anche a cavallo di una settimana e del cambio d'anno.
4. Un database esistente, un backup precedente e un archivio con esiti di attività
   eliminate si aprono senza perdita di dati. Importazione e migrazione fallite
   lasciano intatto l'archivio iniziale.
5. Le formule delle Statistiche esistenti restano invariate e la nuova interfaccia
   è verificata a dimensioni desktop e strette, con tastiera e testo lungo.

Eseguire `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`. Per
Provider e inizializzazione usare anche `/tests/database.browser.html` con Vite;
per la UI verificare Oggi e Abitudini nel browser. I test SQLite devono usare file
temporanei, includendo apertura di uno schema precedente e rollback su errore.

## Ordine dei cambiamenti nel repository

1. Contratti e test di dominio; modello, validazione e migrazione/backup.
2. Operazioni nel Provider e viste derivate da snapshot confermato.
3. Editor e timeline di Abitudini.
4. Dashboard Oggi, collegamento al Calendario e navigazione.
5. Verifiche end-to-end, documentazione del comportamento e aggiornamento dello
   [stato del progetto](stato-progetto.md) solo dopo l'implementazione.
