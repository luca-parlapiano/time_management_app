import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DevScreen } from "./screens/dev/DevScreen";
import "./styles.css";
import "./themes.css";

// Entrata Vite per il laboratorio: nessun Provider collegato al database personale.
createRoot(document.getElementById("root")!).render(<StrictMode><main className="dev-standalone"><h1 id="tab-dev">Laboratorio Dev</h1><DevScreen active /></main></StrictMode>);
