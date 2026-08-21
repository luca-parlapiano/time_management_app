export interface NewUserWizardStep {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  userGuidance: string;
  plannedFields: string[];
}

export const newUserWizardSteps: NewUserWizardStep[] = [
  {
    id: "goals",
    eyebrow: "Step 1",
    title: "Obiettivi e priorita'",
    description:
      "Il primo blocco deve capire che cosa l'utente vuole davvero difendere nella settimana.",
    userGuidance:
      "Inserisci gli obiettivi che vuoi davvero portare avanti, assegna una priorita' chiara e scegli per quanto tempo vuoi impostare il piano.",
    plannedFields: [
      "Obiettivi principali",
      "Priorita' 1-5 per ogni obiettivo",
      "Durata del piano desiderata"
    ]
  },
  {
    id: "non-negotiables",
    eyebrow: "Step 2",
    title: "Impegni e orari fissi",
    description:
      "Prima di distribuire il tempo, il sistema deve sapere quali orari vanno rispettati sempre.",
    userGuidance:
      "Inserisci gli orari che fanno gia' parte della tua giornata, come lavoro, medicine, appuntamenti o routine fisse.",
    plannedFields: [
      "Orario di lavoro",
      "Medicine o routine salute",
      "Appuntamenti e orari fissi"
    ]
  },
  {
    id: "time-structure",
    eyebrow: "Step 3",
    title: "Tempo libero",
    description:
      "Qui puoi indicare il tempo che non e' gia' occupato, ma che vuoi comunque lasciare libero e non far toccare al piano.",
    userGuidance:
      "Segna il tempo che vuoi proteggere, come sonno, una mezza giornata libera o fasce in cui non vuoi far entrare altre attivita'.",
    plannedFields: [
      "Sonno o recupero",
      "Mezze giornate da proteggere",
      "Fasce che vuoi lasciare libere"
    ]
  },
  {
    id: "rhythm",
    eyebrow: "Step 4",
    title: "Ritmo personale",
    description:
      "L'app deve capire quando l'utente rende meglio e qual e' la sua finestra reale di esecuzione.",
    userGuidance:
      "Indicaci quanta energia hai nelle diverse fasce della giornata, quante ore di sonno vuoi proteggere e che tipo di blocchi preferisci.",
    plannedFields: [
      "Ore di sonno da proteggere",
      "Profilo energia mattina-pomeriggio-sera",
      "Durata dei blocchi e stile di lavoro"
    ]
  },
  {
    id: "style",
    eyebrow: "Step 5",
    title: "Stile del piano",
    description:
      "Questa parte definisce quanto il piano deve essere rigido, bufferizzato o aggressivo.",
    userGuidance:
      "Scegli quanto margine vuoi lasciare agli imprevisti e quale stile di lavoro ti somiglia di piu'.",
    plannedFields: [
      "Livello di flessibilita' desiderata",
      "Stile di lavoro preferito",
      "Principali difficolta' percepite"
    ]
  },
  {
    id: "preview",
    eyebrow: "Step 6",
    title: "Anteprima e selezione",
    description:
      "Dopo il profilo, il sistema prepara 4 piani generici coerenti con i dati raccolti e chiede in quale l'utente si riconosce di piu'.",
    userGuidance:
      "Confronta le anteprime e scegli quella che senti piu' vicina al tuo modo reale di lavorare e vivere la settimana.",
    plannedFields: [
      "Confronto delle 4 anteprime",
      "Scelta del piano piu' affine",
      "Conferma del punto di partenza"
    ]
  }
];
