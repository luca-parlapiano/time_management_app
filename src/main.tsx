import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { DBProvider } from "./providers/DBProvider";
import { LoadingProvider } from "./providers/LoadingProvider";
import "./styles.css";
import "./themes.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LoadingProvider>
      <DBProvider>
        <App />
      </DBProvider>
    </LoadingProvider>
  </React.StrictMode>
);
