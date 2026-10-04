import { useEffect, useState } from "react";

/** Restituisce l’ora locale aggiornata all’inizio di ogni minuto, anche dopo la sospensione dell’app. */
export function useLocalMinute(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: number;
    const tick = () => {
      setNow(new Date());
      timer = window.setTimeout(tick, 60_000 - Date.now() % 60_000);
    };
    timer = window.setTimeout(tick, 60_000 - Date.now() % 60_000);
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}
