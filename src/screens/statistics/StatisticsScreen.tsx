import { useDB } from "../../hooks/useDB";
import { CalendarStatistics } from "./CalendarStatistics";

interface StatisticsScreenProps { active: boolean }

/** Schermata annuale delle statistiche del calendario. */
export function StatisticsScreen({ active }: StatisticsScreenProps) {
  const { state, archive } = useDB();
  return (
    <section id="panel-statistics" className="app-screen" role="tabpanel" aria-labelledby="tab-statistics" tabIndex={0} hidden={!active}>
      <header className="calendar-header">
        <div><p className="eyebrow">Vista annuale</p><h2>Statistiche</h2></div>
      </header>
      <div className="screen-content statistics-screen-content">
        <CalendarStatistics state={state} history={archive.history} />
      </div>
    </section>
  );
}
