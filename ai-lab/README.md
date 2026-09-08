# AI Lab: Planner Locale

Questo spazio isola ricerca, dataset, valutazione e addestramento AI dal client Electron.
Non contiene dati personali degli utenti e non modifica il planner di produzione.

## Decisione Iniziale

Addestrare un adapter QLoRA, non un LLM da zero.

- Modello candidato: `Qwen/Qwen3-4B`.
- Licenza del modello candidato: Apache-2.0.
- Compito iniziale: testo libero in italiano -> `PlanningIntent` JSON valido.
- Macchina di training: PC con RTX 3070, presumibilmente 8 GB VRAM.
- Mac: preparazione dati, valutazione e revisione; non training principale.

Qwen3-4B dichiara 4B parametri e supporto multilingue. Con 8 GB VRAM il training deve
usare QLoRA a 4 bit, micro-batch `1`, sequenze corte e gradient accumulation. Non e'
garantito finche' non viene eseguito il preflight della macchina.

## Cosa Addestriamo

L'adapter deve imparare a:

- riconoscere obiettivi, abitudini, vincoli e preferenze dal linguaggio dell'utente;
- distinguere dati dichiarati da inferenze o informazioni mancanti;
- formulare domande brevi per i dati indispensabili;
- restituire solo JSON aderente allo schema `planning-intent.v1`.

Non deve assegnare autonomamente slot, modificare impegni, fare diagnosi o decidere le
priorita' dell'utente. Il motore deterministico resta responsabile di capacita', conflitti,
buffer e proposta calendarizzata.

## Struttura Prevista

```text
ai-lab/
  data/
    train.seed.v0.1.jsonl
    validation.seed.v0.1.jsonl
    test.seed.v0.1.jsonl
    private/                # ignorato da Git: mai committare dati personali
  schemas/
    planning-intent.v1.schema.json
  configs/
    qwen3-4b-qlora.example.yaml
  scripts/
    validate-dataset.mjs
  README.md
```

Ogni riga JSONL contiene `id`, `input` e `output`. L'`output` deve rispettare lo schema
`planning-intent.v1`. Il seed `v0.1` contiene esempi sintetici e revisionabili: serve a
validare formato e valutazione, non e' ancora un corpus sufficiente per il fine-tuning.

Il file di test deve restare separato dal training e contenere casi mai mostrati al modello.
All'inizio gli esempi saranno scritti e revisionati da noi, inclusi casi ambigui, overload,
vincoli incompatibili e linguaggio informale italiano. Dati reali possono essere usati solo
con consenso esplicito e dopo anonimizzazione.

Validare il dataset con:

```bash
node ai-lab/scripts/validate-dataset.mjs
```

## Preflight Sul PC

Prima di installare o scaricare un modello, verificare:

```bash
nvidia-smi
python --version
```

Obiettivo minimo: driver NVIDIA funzionante, Python 3.11 e GPU rilevata con circa 8 GB di
VRAM. Su Windows e' preferibile lavorare in WSL2 o Linux per ridurre le incompatibilita'
CUDA; PyTorch va installato usando il comando generato dal suo configuratore ufficiale per
la combinazione sistema operativo, CUDA e Python effettivamente presenti.

## Primo Esperimento

Non parte dal fine-tuning. Prima eseguiamo il modello base su 50 casi di valutazione e
misuriamo:

- JSON sintatticamente valido;
- conformita' allo schema;
- corretta estrazione di obiettivi, vincoli e domande mancanti;
- assenza di dati inventati;
- tempo di risposta e memoria usata.

Se il prompting non basta, il primo QLoRA usa:

- contesto massimo: 512 token;
- micro-batch: 1;
- gradient accumulation: 16;
- gradient checkpointing: attivo;
- quantizzazione base: 4 bit NF4;
- LoRA rank: 8, da aumentare solo dopo il primo benchmark;
- target iniziale: proiezioni attention, senza adattare tutto il modello.

Questi sono parametri di partenza, non valori finali. Vanno modificati solo dopo aver
misurato VRAM, tempo per step e qualita' sul test set separato.

## Criteri Di Successo

Il modello non entra nell'app solo perche' genera testo gradevole. Deve soddisfare tutti i
criteri seguenti sul test set:

- nessun output invalido arriva al planner: validazione schema obbligatoria;
- nessun vincolo viene trasformato in slot senza passare dal motore locale;
- miglioramento misurabile rispetto al prompt base nell'estrazione strutturata;
- nessuna regressione importante su italiano colloquiale e casi incompleti;
- prestazioni accettabili sull'hardware desktop dichiarato.

## Passaggio Successivo

Quando il preflight e la baseline saranno disponibili, scegliamo tra:

1. mantenere prompting + validazione, se gia' sufficiente;
2. addestrare QLoRA su dataset curato;
3. ridurre a un modello piu' piccolo se la 3070 non regge tempi e memoria richiesti.

## Fonti

- [Qwen3-4B: modello, lingue e licenza](https://huggingface.co/Qwen/Qwen3-4B)
- [Hugging Face PEFT: QLoRA e quantizzazione](https://huggingface.co/docs/peft/developer_guides/quantization)
- [Hugging Face PEFT: LoRA](https://huggingface.co/docs/peft/main/conceptual_guides/lora)
- [PyTorch: installazione locale](https://pytorch.org/get-started/locally/)
