# Pubblicare l'informativa privacy di MindMorrow

La pagina HTML pronta per GitHub Pages è [`../../docs/privacy/index.html`](../../docs/privacy/index.html). Descrive la versione mobile 0.1.0 verificata nel codice; è **una bozza da verificare** prima di renderla pubblica. Non copre automaticamente l'app desktop, le future librerie o eventuali servizi aggiunti alla build finale.

## Prima di pubblicare

1. Conferma che **Luca Parlapiano** sia il nome da indicare come titolare negli store e che `parlapiano_luca@posteo.com` sia ancora un'email funzionante. L'email proviene dall'informativa pubblica di DailyRise; il nome è ricavato dall'account GitHub e va confermato. Valuta con un professionista se servono ulteriori dati di contatto o modifiche per la tua situazione.
2. Controlla la **build definitiva**, i permessi e gli SDK effettivamente inclusi. Aggiorna il testo se introduci analytics, pubblicità, crash reporting, account o sincronizzazione.
3. Verifica che il testo sia coerente con le risposte a Google Play Data Safety e Apple App Privacy. Il salvataggio locale sul dispositivo e i backup condivisi volontariamente vanno descritti secondo le definizioni dei rispettivi moduli.

## Ottenere il link con GitHub Pages

Il repository configurato localmente è `luca-parlapiano/time_management_app`; il ramo principale è `main`. La pagina è in `docs/privacy/index.html` perché GitHub Pages può pubblicare la cartella `/docs` di un ramo.

1. Dopo aver confermato nome e contatto, esegui commit e push dei file `docs/` sul ramo `main` (oppure pubblicali dal sito GitHub).
2. Apri il repository su GitHub → **Settings** → **Pages**.
3. In **Build and deployment**, scegli **Deploy from a branch**, poi `main` e `/docs`; premi **Save**.
4. Dopo che GitHub ha completato la pubblicazione, apri e verifica questo indirizzo previsto: `https://luca-parlapiano.github.io/time_management_app/privacy/`.
5. Inserisci **l'URL verificato** nel campo privacy di Google Play Console e App Store Connect e sostituisci `[DA INSERIRE]` in `testi-store-it.txt`.
6. Aggiungi un accesso all'informativa anche dalle impostazioni dell'app prima dell'invio agli store.

La pagina deve essere pubblica e accessibile senza login. GitHub Pages pubblica il contenuto online anche quando il repository è privato, se il piano dell'account consente Pages. L'URL indicato sopra è previsto dalla struttura del repository, ma esiste solo dopo l'attivazione e la pubblicazione riuscita.

Fonti: [GitHub Pages: scelta della sorgente](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [Google Play: informativa privacy](https://support.google.com/googleplay/android-developer/answer/10144311), [Apple: App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/).
