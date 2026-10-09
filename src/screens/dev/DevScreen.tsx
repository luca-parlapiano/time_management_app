import { useState } from "react";
import { StandardButton } from "../../components/ui/StandardButton";
import { DBProvider } from "../../providers/DBProvider";
import { LoadingProvider } from "../../providers/LoadingProvider";
import { createDevRepository } from "../../repository/DevRepository";
import type { PlannerArchive } from "../../model/outcomeArchive.js";
import { DevWorkbench } from "./DevWorkbench";
import "./dev.css";

/** Mantiene la sessione isolata fra cambi di scheda; il laboratorio parte solo su richiesta. */
export function DevScreen({ active, sourceArchive }: { active: boolean; sourceArchive?: PlannerArchive }) {
  const [repository, setRepository] = useState<ReturnType<typeof createDevRepository> | null>(null);
  return <section id="panel-dev" className="app-screen" role="tabpanel" aria-labelledby="tab-dev" tabIndex={0} hidden={!active}>
    <div className="screen-content dev-screen">
      <header className="dev-banner"><div><p className="eyebrow">Laboratorio isolato</p><h2>Dev · Azione e reazione</h2></div><span className="dev-badge">Solo memoria</span>
        <p>Prova esiti, traguardi e pianificazione con le stesse operazioni dell’app. I dati del laboratorio restano disponibili fra le schede, ma si perdono chiudendo o ricaricando l’app.</p>
      </header>
      {repository ? <LoadingProvider><DBProvider repository={repository}><DevWorkbench sourceArchive={sourceArchive} /></DBProvider></LoadingProvider>
        : <div className="dev-card"><p>Crea un’abitudine o una routine e compila subito tutti i giorni del suo piano, anche futuri.{sourceArchive && " Puoi anche partire da una copia dei dati dell’app."} Le modifiche qui non vengono scritte nel database personale.</p><StandardButton variant="primary" onClick={() => setRepository(createDevRepository())}>Avvia laboratorio</StandardButton></div>}
    </div>
  </section>;
}
