# Materiali per gli store — MindMorrow 0.1.0

Questa cartella contiene gli asset della **scheda Google Play in italiano** e una bozza per App Store. Le quattro schermate Android sono catture reali dell'app in Expo Go, con dati dimostrativi creati in un profilo Android separato. I PNG finali non hanno trasparenza né cornici aggiunte.

## File pronti per Google Play

| Uso | File | Formato |
| --- | --- | --- |
| Icona scheda | `google-play/graphics/icon-512.png` | PNG RGBA, 512 × 512, meno di 1 MB |
| Grafica in evidenza | `google-play/graphics/feature-graphic-1024x500.png` | PNG RGB, 1024 × 500 |
| Screenshot telefono 1–4 | `google-play/phone-1080x1920/` | PNG RGB, 1080 × 1920, 9:16 |
| Testi e alt text | `testi-store-it.txt` | UTF-8 |

Ordine suggerito delle schermate: Oggi, abitudine a step, obiettivo a ore, calendario. Le schermate mostrano solo funzioni presenti nella versione mobile: nessun editor completo del calendario o sincronizzazione con l'app desktop.

Google Play richiede almeno due screenshot e raccomanda quattro screenshot 1080 × 1920 per le app in formato verticale. Le sezioni per tablet da 7 e 10 pollici sono facoltative nella scheda standard; se si vuole promuovere l'esperienza su schermi grandi, acquisire **quattro screenshot reali per ciascun tipo di tablet** dopo una verifica del layout. Non riutilizzare le catture del telefono come immagini tablet. [Specifiche ufficiali Google Play](https://support.google.com/googleplay/android-developer/answer/9866151)

## App Store

`app-store/icon-1024.png` è l'icona quadrata opaca 1024 × 1024 da usare come sorgente dell'icona iOS. L'icona effettiva viene inclusa nella build; non sostituisce la configurazione Expo già presente in `app.json`. [Linee guida Apple per le icone](https://developer.apple.com/design/human-interface-guidelines/app-icons)

Gli screenshot App Store **non sono ancora presenti**: vanno catturati da una build iOS reale o da un simulatore iOS, senza riadattare gli screenshot Android. Le dimensioni attualmente richieste sono almeno uno screenshot iPhone con Dynamic Island, display medio (per esempio 1179 × 2556 o 1206 × 2622). `app.json` dichiara `ios.supportsTablet: true`, quindi serve anche almeno uno screenshot per iPad 13 pollici (2064 × 2752 o 2048 × 2732). [Specifiche ufficiali App Store Connect](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)

## Da completare prima dell'invio

- Verificare nome del titolare e contatto nell'[informativa privacy](../../docs/privacy/index.html), seguire [le istruzioni GitHub Pages](PUBBLICAZIONE-PRIVACY.md), poi inserire l'URL pubblico verificato e gli altri contatti indicati come `[DA INSERIRE]` in `testi-store-it.txt`.
- Preparare l'informativa privacy e compilare i questionari Google Play Data Safety e Apple App Privacy sulla **build definitiva**.
- Produrre e verificare una build Android firmata (`.aab`) e, per App Store, una build iOS firmata. Questa cartella contiene materiali della scheda, non i binari di pubblicazione.
- Eseguire una revisione finale degli screenshot dopo la build di produzione, perché Expo Go può mostrare elementi di sviluppo e perché la UI potrebbe cambiare.

## Sorgenti e rigenerazione

`prepare_graphics.py` ricava le icone da `../assets/images/icon.png` e la grafica in evidenza da `source/feature-graphic-master.png`. Richiede Pillow (`python3 -m pip install pillow`) e salva i PNG finali nelle cartelle sopra. La grafica master è stata creata usando l'icona esistente come riferimento cromatico; non contiene testi o promesse di funzionalità.
