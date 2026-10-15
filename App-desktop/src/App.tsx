import { AppShell } from "./components/layout/AppShell";
import { StandardButton } from "./components/ui/StandardButton";
import { useDB } from "./hooks/useDB";

/** Mostra lo stato di avvio e apre l’interfaccia quando il database è pronto. */
export default function App() {
  const { ready, error, retry } = useDB();
  if (!ready) {
    return (
      <main className="database-loading">
        <h1>Agenda</h1>
        {error && (
          <>
            <p role="alert">{error}</p>
            <StandardButton variant="secondary" onClick={() => void retry()}>Riprova</StandardButton>
          </>
        )}
      </main>
    );
  }
  return <AppShell />;
}
