import { useState } from 'react';
import { StandardButton } from '../../components/ui/StandardButton';
import { useDB } from '../../hooks/useDB';
import { StepHabitsView } from './StepHabitsView';
import type { HabitsScreenProps } from './StepHabitsView';
import { WeeklyTimeHabits } from './WeeklyTimeHabits';
import type { WeeklyTimeActions } from './WeeklyTimeHabits';

/** Separa i due metodi di apprendimento senza cambiare formule o chiusura delle serie a step. */
export function HabitsScreen(props: HabitsScreenProps & WeeklyTimeActions) {
  const { weeklyTimeHabits } = useDB();
  const [selectedMode, setSelectedMode] = useState<'steps' | 'hours'>('steps');
  const mode = props.selectedHabitId ? weeklyTimeHabits.some(habit => habit.id === props.selectedHabitId) ? 'hours' : 'steps' : selectedMode;
  return <section id="panel-habits" className="app-screen" role="tabpanel" aria-labelledby="tab-habits" tabIndex={0} hidden={!props.active}>
    <div className="calendar-view-switch habit-mode-switch" role="group" aria-label="Metodo di apprendimento">
      <StandardButton variant="ghost" aria-pressed={mode === 'steps'} onClick={() => { setSelectedMode('steps'); props.onSelectHabit(undefined); }}>A step</StandardButton>
      <StandardButton variant="ghost" aria-pressed={mode === 'hours'} onClick={() => { setSelectedMode('hours'); props.onSelectHabit(undefined); }}>A ore</StandardButton>
    </div>
    <div className="screen-content"><StepHabitsView {...props} active={mode === 'steps'} />{mode === 'hours' && <><header className="calendar-header"><div><p className="eyebrow">Tempo per imparare</p><h2>Abitudini a ore</h2><p>Una serie alla volta, con un obiettivo settimanale o mensile.</p></div></header><WeeklyTimeHabits selectedId={props.selectedHabitId} onSelect={props.onSelectHabit} onEditWeekly={props.onEditWeekly} onAddTime={props.onAddTime} onPlanTime={props.onPlanTime} onReviewSeries={props.onReviewSeries} /></>}</div>
  </section>;
}
