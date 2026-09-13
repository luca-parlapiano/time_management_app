# Architettura E Distribuzione Dell'AI

## Decisione

Il modello AI non viene incluso nel pacchetto di installazione Electron. L'app deve poter
essere installata, avviata e usata senza scaricare pesi aggiuntivi. L'AI e' una funzione
opzionale con piu' provider intercambiabili.

```text
UI React
  -> PlanningIntentService
  -> PlanningIntentProvider
       |- ManualProvider
       |- OllamaProvider
       |- LocalModelProvider
       `- CloudProvider
  -> validazione PlanningIntent
  -> domande e revisione dell'utente
  -> motore deterministico di pianificazione
```

Il planner non dipende da uno specifico modello. Tutti i provider devono restituire lo
stesso contratto `PlanningIntent`; la validazione, le domande mancanti e la conferma
dell'utente rimangono comuni.

## Modalita' Disponibili

| Modalita' | Download aggiuntivo | Uso previsto |
| --- | ---: | --- |
| Manuale | Nessuno | Inserimento e modifica tramite interfaccia |
| Ollama | Scelto dall'utente | Riusa un modello gia' installato nel computer |
| Modello locale gestito | Circa 2,5 GB | Funzionamento offline con il modello distribuito dall'app |
| Cloud | Nessuno | Alternativa per dispositivi senza risorse locali, se introdotta |

La modalita' manuale resta sempre disponibile. L'assenza o un errore dell'AI non deve
impedire l'accesso ai dati e alle funzioni principali.

## Modello Locale Gestito

Il candidato desktop e' Qwen3-4B con l'adapter `planning-intent-v3.1-160` incorporato e
convertito in un unico file GGUF quantizzato `Q4_K_M`. Il file previsto e':

```text
qwen3-4b-planning-intent-q4_k_m.gguf
```

La dimensione stimata e' circa 2,5 GB. Il GGUF non viene inserito in `extraResources`, in
un archivio dell'installer o nel repository Git. Comprimerlo ulteriormente produrrebbe un
vantaggio limitato.

## Esperienza Di Attivazione

Quando l'utente usa per la prima volta una funzione AI, l'app propone queste opzioni:

1. collegare Ollama, se presente;
2. scaricare il modello locale;
3. usare il provider cloud, se configurato in una release futura;
4. continuare con l'inserimento manuale.

Prima del download vengono mostrati dimensione, spazio richiesto e possibilita' di
rimuovere il modello. Il download deve supportare avanzamento, annullamento e ripresa.

## Posizione Dei File Installati

I file scaricati non vengono salvati nella directory di installazione dell'app, perche' un
aggiornamento potrebbe sostituirla. Su Windows la destinazione e':

```text
%LOCALAPPDATA%/TimeManagementApp/ai/models/
```

Durante il download si usa un file temporaneo, per esempio con estensione `.part`. Il file
assume il nome definitivo solo dopo il completamento e la verifica dell'hash SHA-256.

## Risorse Incluse Nell'App

Il pacchetto Electron contiene soltanto file piccoli e versionati:

```text
resources/ai/
  manifest.json
  planning-intent.prompt.txt
  schema.json
```

Il runtime locale potra' essere incluso tra le risorse native dell'app oppure gestito come
componente separato. I pesi del modello restano sempre esterni all'installer.

Esempio indicativo di `manifest.json`:

```json
{
  "id": "qwen3-4b-planning-intent",
  "version": "1.0.0",
  "fileName": "qwen3-4b-planning-intent-q4_k_m.gguf",
  "sizeBytes": 0,
  "downloadUrl": "https://huggingface.co/ACCOUNT/REPOSITORY/resolve/main/qwen3-4b-planning-intent-q4_k_m.gguf",
  "sha256": "DA_COMPILARE_DOPO_LA_CONVERSIONE"
}
```

Dimensione e hash saranno compilati usando il file GGUF definitivo, senza valori stimati.

## Responsabilita' Del Download Manager

- verificare lo spazio libero prima di iniziare;
- scaricare in background mostrando percentuale e byte trasferiti;
- supportare la ripresa tramite richieste HTTP compatibili con range;
- verificare dimensione e SHA-256;
- non usare mai un file parziale o non valido;
- consentire aggiornamento, riparazione e rimozione del modello;
- mantenere separate la versione dell'app e quella del modello.

## Distribuzione

Per la prima distribuzione il GGUF puo' essere pubblicato in un repository pubblico su
Hugging Face. L'app lo scarica dall'URL dichiarato nel manifest senza incorporare credenziali.
Un repository privato richiederebbe autenticazione e non deve essere usato inserendo token
segreti nel client.

Se il volume di download cresce, lo stesso file potra' essere spostato su uno storage con
CDN senza cambiare il contratto del provider: sara' sufficiente pubblicare un nuovo manifest
o aggiornare il relativo URL.

## Sequenza Di Implementazione

1. Definire l'interfaccia `PlanningIntentProvider` e mantenere il flusso manuale.
2. Integrare `OllamaProvider` per completare e verificare il flusso desktop.
3. Unire Qwen3-4B e LoRA, creare il GGUF `Q4_K_M` e verificarne i risultati.
4. Pubblicare GGUF, hash e metadati su Hugging Face.
5. Implementare download manager e `LocalModelProvider`.
6. Valutare `CloudProvider` solo quando esiste una necessita' di prodotto concreta.

