# Runtime AI resources

## Runtime

L'app usa `llama-server` di `llama.cpp` e Qwen3-4B `Q4_K_M`. Se il modello non e
presente localmente, `llama.cpp` lo scarica dal repository ufficiale
`Qwen/Qwen3-4B-GGUF`. Per forzare un file locale, copialo in:

    models/qwen3-4b-q4_k_m.gguf

Per scaricarlo direttamente in questa directory prima dell'avvio dell'app:

    npm run ai:download-model

## Adapter opzionale

Un adapter addestrato sullo stesso Qwen3-4B deve essere convertito in GGUF e salvato in:

    adapters/planning-intent-qwen3-4b.gguf

I pesi, gli adapter e gli eseguibili nativi sono locali e ignorati da Git.
