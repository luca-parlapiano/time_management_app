# Pubblicare l'informativa privacy di MindMorrow

Il file [`github-pages/index.html`](github-pages/index.html) è pronto da caricare nella radice di un repository pubblico GitHub Pages. È una copia identica di [`../../docs/privacy/index.html`](../../docs/privacy/index.html). Descrive la versione mobile 0.1.0 verificata nel codice; è **una bozza da verificare** prima di renderla pubblica. Non copre automaticamente l'app desktop, le future librerie o eventuali servizi aggiunti alla build finale.

## Prima di pubblicare

1. Conferma che **Luca Parlapiano** sia il nome da indicare come titolare negli store e che `parlapiano_luca@posteo.com` sia ancora un'email funzionante. L'email proviene dall'informativa pubblica di DailyRise; il nome è ricavato dall'account GitHub e va confermato. Valuta con un professionista se servono ulteriori dati di contatto o modifiche per la tua situazione.
2. Controlla la **build definitiva**, i permessi e gli SDK effettivamente inclusi. Aggiorna il testo se introduci analytics, pubblicità, crash reporting, account o sincronizzazione.
3. Verifica che il testo sia coerente con le risposte a Google Play Data Safety e Apple App Privacy. Il salvataggio locale sul dispositivo e i backup condivisi volontariamente vanno descritti secondo le definizioni dei rispettivi moduli.

## Ottenere un link gratuito con GitHub Pages

Con GitHub Free, Pages funziona nei repository **pubblici**. Se `luca-parlapiano/time_management_app` è privato e GitHub propone un upgrade, lascialo privato: pubblica **solo l'informativa** in un nuovo repository pubblico separato.

1. Su GitHub crea un repository pubblico, per esempio `mindmorrow-privacy`.
2. Apri il nuovo repository, scegli **Add file → Upload files** e carica **solo** `App-mobile/store-publishing/github-pages/index.html` nella radice del nuovo repository. Conferma il commit su GitHub. Prima del caricamento verifica nome e email nella pagina.
3. Nel nuovo repository apri **Settings → Pages**. In **Build and deployment** scegli **Deploy from a branch**, poi `main` e `/(root)`; premi **Save**.
4. Quando GitHub ha completato la pubblicazione, apri e verifica l'indirizzo previsto: `https://luca-parlapiano.github.io/mindmorrow-privacy/` (il percorso cambia se scegli un altro nome per il repository).
5. Inserisci **l'URL verificato** nel campo privacy di Google Play Console e App Store Connect e sostituisci `[DA INSERIRE]` in `testi-store-it.txt`.
6. Aggiungi un accesso all'informativa anche dalle impostazioni dell'app prima dell'invio agli store. Quando aggiorni l'informativa, aggiorna anche la copia `github-pages/index.html` e il file nel repository pubblico.

Se in futuro rendi pubblico il repository dell'app, puoi invece pubblicare la cartella `docs/` di `main` e usare `https://luca-parlapiano.github.io/time_management_app/privacy/`. Non rendere pubblico il repository dell'app solo per evitare il costo di Pages: il repository separato espone unicamente il documento che vuoi pubblicare.

Fonti: [GitHub Pages: scelta della sorgente](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [Google Play: informativa privacy](https://support.google.com/googleplay/android-developer/answer/10144311), [Apple: App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/).
