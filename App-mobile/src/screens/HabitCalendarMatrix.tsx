import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { eventColors } from '../core/constants';
import { indexHabitOutcomes } from '../core/domain/habitOutcomeIndex';
import { seriesForSession } from '../core/domain/timeSeries';
import type { Habit, HabitTimelineEntry } from '../core/model/habit';
import type { TimePeriod, TimeSession, WeeklyTimeHabit } from '../core/model/weeklyTime';
import { addDays, displayDate, today, weekStart } from '../core/utils/dates';
import { formatDurationMinutes } from '../core/utils/time';
import { usePlanner } from '../data/PlannerProvider';
import { AppScreen, DatabaseGate, Surface } from '../ui/Primitives';
import { useAppColors } from '../ui/theme';
import type { AppColors } from '../ui/theme';

const weekdayLabels = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

function monthEnd(month: string): string {
  const [year, number] = month.split('-').map(Number);
  const next = number === 12 ? String(year + 1) + '-01-01' : String(year) + '-' + String(number + 1).padStart(2, '0') + '-01';
  return addDays(next, -1);
}

function shiftMonth(month: string, amount: number): string {
  const date = new Date(month + '-01T00:00:00Z');
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}

function calendarWeeks(from: string, through: string): string[][] {
  const weeks: string[][] = [];
  for (let start = weekStart(from); start <= weekStart(through); start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(start, index)));
  }
  return weeks;
}

function dateRange(from: string, through: string): string {
  return displayDate(from, { day: 'numeric', month: 'short' }) + ' – ' + displayDate(through, { day: 'numeric', month: 'short' });
}

function compactMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? hours + 'h' + (rest || '') : minutes + 'm';
}

function MonthNavigation({ month, onChange, colors }: { month: string; onChange: (month: string) => void; colors: AppColors }) {
  const label = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(month + '-01T00:00:00Z'));
  return <View style={styles.monthNavigation}>
    <Pressable accessibilityRole="button" accessibilityLabel="Mese precedente" onPress={() => onChange(shiftMonth(month, -1))} style={[styles.monthArrow, { backgroundColor: colors.soft }]}><Text style={[styles.monthArrowText, { color: colors.text }]}>‹</Text></Pressable>
    <Text style={[styles.monthTitle, { color: colors.text }]}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Mese successivo" onPress={() => onChange(shiftMonth(month, 1))} style={[styles.monthArrow, { backgroundColor: colors.soft }]}><Text style={[styles.monthArrowText, { color: colors.text }]}>›</Text></Pressable>
  </View>;
}

function Weekdays({ colors }: { colors: AppColors }) {
  return <View style={styles.weekdays}>{weekdayLabels.map((label, index) => <Text key={index} style={[styles.weekday, { color: colors.muted }]}>{label}</Text>)}</View>;
}

/** Matrice mensile della singola abitudine, con progressi derivati dallo storico confermato. */
export function HabitCalendarMatrix({ kind, id, onBack }: { kind: 'steps' | 'hours'; id: string; onBack: () => void }) {
  const { snapshot, statistics } = usePlanner();
  const colors = useAppColors();
  const [month, setMonth] = useState(today().slice(0, 7));
  if (!snapshot || !statistics) return <DatabaseGate><></></DatabaseGate>;
  const habit = kind === 'steps' ? snapshot.archive.habits?.find(item => item.id === id) : snapshot.archive.weeklyTimeHabits?.find(item => item.id === id);
  if (!habit) return <AppScreen title="Calendario"><Pressable accessibilityRole="button" onPress={onBack}><Text style={{ color: colors.accent }}>‹ Tutte le abitudini</Text></Pressable></AppScreen>;
  return <AppScreen eyebrow={kind === 'steps' ? 'Abitudine a step' : 'Obiettivo a ore'} title={habit.title}>
    <Pressable accessibilityRole="button" accessibilityLabel="Torna alla lista delle abitudini" onPress={onBack} style={styles.backButton}><Text style={[styles.backText, { color: colors.accent }]}>‹ Tutte le abitudini</Text></Pressable>
    <MonthNavigation month={month} onChange={setMonth} colors={colors} />
    {kind === 'steps' ? <StepMatrix habit={habit as Habit} month={month} colors={colors} /> : <TimeMatrix habit={habit as WeeklyTimeHabit} month={month} colors={colors} />}
  </AppScreen>;
}

function StepMatrix({ habit, month, colors }: { habit: Habit; month: string; colors: AppColors }) {
  const { snapshot, statistics } = usePlanner();
  const [chosenDay, setChosenDay] = useState<string | null>(null);
  if (!snapshot || !statistics) return null;
  const from = month + '-01', through = monthEnd(month);
  const weeks = calendarWeeks(from, through);
  const gridFrom = weeks[0][0], gridThrough = weeks[weeks.length - 1][6];
  const entries = statistics.getHabitTimeline(habit.id, gridFrom, gridThrough);
  const byDay = new Map<string, HabitTimelineEntry[]>();
  for (const entry of entries) byDay.set(entry.date, [...(byDay.get(entry.date) ?? []), entry]);
  const records = [...(indexHabitOutcomes(snapshot.archive.history).byActivity.get(habit.id)?.records ?? [])]
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.occurrenceDate.localeCompare(b.occurrenceDate) || a.sourceId.localeCompare(b.sourceId))
    .slice(0, habit.stepTarget);
  const closedOn = statistics.getHabitCompletionDate(habit.id);
  const success = Boolean(closedOn && records.length === habit.stepTarget && records.every(record => record.outcome === 'completed'));
  const done = records.filter(record => record.outcome === 'completed').length;
  const inMonth = (date: string) => date >= from && date <= through;
  const suggested = closedOn && inMonth(closedOn) ? closedOn : [...records].reverse().find(record => inMonth(record.eventDate))?.eventDate ?? (inMonth(today()) ? today() : from);
  const selected = chosenDay && inMonth(chosenDay) ? chosenDay : suggested;
  const selectedEntries = byDay.get(selected) ?? [];
  const evaluatedThrough = records.filter(record => record.eventDate <= selected).length;
  const accent = eventColors[habit.color].value;
  return <>
    <Text style={[styles.description, { color: colors.muted }]}>{habit.stepTarget} step da valutare. Ogni esito fa avanzare il percorso.</Text>
    <View style={styles.legend}><Text style={[styles.legendText, { color: accent }]}>✓ Fatto</Text><Text style={[styles.legendText, { color: colors.danger }]}>× Non fatto</Text><Text style={[styles.legendText, { color: colors.muted }]}>· Senza esito</Text></View>
    <Weekdays colors={colors} />
    {weeks.map(days => {
      const weekEnd = days[6];
      const count = records.filter(record => record.eventDate <= weekEnd).length;
      const endedHere = Boolean(closedOn && closedOn >= days[0] && closedOn <= weekEnd);
      return <View key={days[0]} style={[styles.weekCard, { backgroundColor: colors.surface, borderColor: endedHere && success ? colors.accent : colors.border }]}>
        <View style={styles.weekHeader}><Text style={[styles.weekTitle, { color: colors.text }]}>{dateRange(days[0], weekEnd)}</Text><Text style={[styles.weekTotal, { color: endedHere && success ? colors.accent : colors.muted }]}>{endedHere ? success ? '✓ Completata' : 'Serie conclusa' : count + '/' + habit.stepTarget + ' step'}</Text></View>
        <View style={styles.days}>{days.map(date => {
          const dayEntries = byDay.get(date) ?? [];
          const finished = dayEntries.filter(entry => entry.outcome === 'completed').length;
          const missed = dayEntries.filter(entry => entry.outcome === 'skipped').length;
          const ordinal = records.filter(record => record.eventDate <= date).length;
          const marker = finished && missed ? '✓×' : finished ? '✓' + (ordinal || '') : missed ? '×' + (ordinal || '') : dayEntries.length ? '·' : '';
          const milestone = date === closedOn;
          const activeMonth = inMonth(date);
          const cellColor = milestone && success ? colors.accent : finished ? colors.soft : colors.surface;
          const markerColor = milestone && success ? colors.accentText : missed && !finished ? colors.danger : finished ? accent : colors.muted;
          return <Pressable key={date} accessibilityRole="button" accessibilityLabel={displayDate(date, { weekday: 'long', day: 'numeric', month: 'long' }) + ': ' + (finished ? finished + ' fatti' : missed ? missed + ' non fatti' : dayEntries.length ? 'pianificato' : 'nessuno step')} accessibilityState={{ selected: selected === date }} disabled={!activeMonth} onPress={() => setChosenDay(date)} style={[styles.dayCell, { backgroundColor: cellColor, borderColor: selected === date ? colors.text : colors.border, opacity: activeMonth ? 1 : 0.42 }]}>
            <Text style={[styles.dayNumber, { color: milestone && success ? colors.accentText : colors.text }]}>{Number(date.slice(-2))}</Text>
            <Text style={[styles.dayMark, { color: markerColor }]}>{marker}</Text>
          </Pressable>;
        })}</View>
      </View>;
    })}
    <Surface colors={colors}>
      <Text style={[styles.detailDate, { color: colors.accent }]}>{displayDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      <Text style={[styles.detailHeading, { color: colors.text }]}>{selected === closedOn ? success ? 'Abitudine completata con successo' : 'Serie conclusa' : evaluatedThrough + '/' + habit.stepTarget + ' step valutati'}</Text>
      {selected === closedOn ? <Text style={[styles.detailBody, { color: colors.muted }]}>{done} fatti su {habit.stepTarget} step valutati</Text> : null}
      {selectedEntries.length === 0 ? <Text style={[styles.detailBody, { color: colors.muted }]}>Nessuno step in questo giorno.</Text> : selectedEntries.map(entry => <View key={entry.sourceId + '@' + entry.occurrenceDate} style={styles.detailRow}><Text style={[styles.detailBody, { color: entry.outcome === 'completed' ? accent : entry.outcome === 'skipped' ? colors.danger : colors.muted }]}>{entry.outcome === 'completed' ? '✓ Fatto' : entry.outcome === 'skipped' ? '× Non fatto' : '· ' + (entry.date > today() ? 'Pianificato' : 'Da registrare')}</Text>{entry.start ? <Text style={[styles.detailBody, { color: colors.muted }]}>{entry.start}</Text> : null}</View>)}
    </Surface>
  </>;
}

interface VisiblePeriod {
  key: string;
  start: string;
  end: string;
  target: number;
  period: TimePeriod;
  seriesId?: string;
}

function visiblePeriods(habit: WeeklyTimeHabit, month: string): VisiblePeriod[] {
  const from = month + '-01', through = monthEnd(month);
  if (habit.series) return habit.series.filter(series => series.startsOn <= through && series.endsOn >= from)
    .map(series => ({ key: series.id, start: series.startsOn, end: series.endsOn, target: series.targetMinutes, period: series.period, seriesId: series.id }));
  return calendarWeeks(from, through).flatMap(days => {
    const start = days[0], end = days[6];
    if (end < habit.startsOn || (habit.archivedOn && start > habit.archivedOn)) return [];
    const target = habit.targets.filter(entry => entry.effectiveFrom <= start).at(-1)?.minutes;
    return target ? [{ key: start, start, end, target, period: 'week' as const }] : [];
  });
}

interface PeriodData extends VisiblePeriod {
  sessions: TimeSession[];
  daily: Map<string, number>;
  total: number;
  reachedOn?: string;
}

function TimeMatrix({ habit, month, colors }: { habit: WeeklyTimeHabit; month: string; colors: AppColors }) {
  const { snapshot, statistics } = usePlanner();
  const [chosen, setChosen] = useState<{ key: string; date: string } | null>(null);
  if (!snapshot || !statistics) return null;
  const reference = today();
  const periods: PeriodData[] = visiblePeriods(habit, month).map(period => {
    const sessions = statistics.getTimeSessions(habit.id, period.start, period.end, period.seriesId)
      .filter(session => !session.removed && session.date <= reference && (!period.seriesId || seriesForSession(habit, session)?.id === period.seriesId));
    const daily = new Map<string, number>();
    let total = 0;
    let reachedOn: string | undefined;
    for (const session of sessions) {
      daily.set(session.date, (daily.get(session.date) ?? 0) + session.minutes);
      total += session.minutes;
      if (!reachedOn && total >= period.target) reachedOn = session.date;
    }
    return { ...period, sessions, daily, total, reachedOn };
  });
  const latest = [...periods].reverse().find(period => period.sessions.length || period.reachedOn) ?? periods.at(-1);
  const suggested = latest ? { key: latest.key, date: latest.reachedOn ?? latest.sessions.at(-1)?.date ?? (reference >= latest.start && reference <= latest.end ? reference : latest.start) } : null;
  const current = chosen && periods.some(period => period.key === chosen.key && chosen.date >= period.start && chosen.date <= period.end) ? chosen : suggested;
  const selectedPeriod = periods.find(period => period.key === current?.key);
  const selectedSessions = selectedPeriod?.sessions.filter(session => session.date === current?.date) ?? [];
  const selectedMinutes = selectedSessions.reduce((sum, session) => sum + session.minutes, 0);
  const cumulative = selectedPeriod?.sessions.filter(session => session.date <= (current?.date ?? '')).reduce((sum, session) => sum + session.minutes, 0) ?? 0;
  return <>
    <Text style={[styles.description, { color: colors.muted }]}>Le ore si sommano nel periodo scelto. Il giorno che raggiunge l’obiettivo è evidenziato.</Text>
    <View style={styles.legend}><Text style={[styles.legendText, { color: colors.accent }]}>■ Ore registrate</Text><Text style={[styles.legendText, { color: colors.accent }]}>✓ Obiettivo raggiunto</Text></View>
    {periods.length === 0 ? <Surface colors={colors}><Text style={[styles.detailBody, { color: colors.muted }]}>Nessun obiettivo a ore attivo in questo mese.</Text></Surface> : null}
    {periods.map(period => {
      const achieved = Boolean(period.reachedOn);
      const weeks = calendarWeeks(period.start, period.end);
      return <View key={period.key} style={[styles.weekCard, { backgroundColor: colors.surface, borderColor: achieved ? colors.accent : colors.border }]}>
        <View style={styles.periodHeader}><View style={styles.flex}><Text style={[styles.weekTitle, { color: colors.text }]}>{period.period === 'month' ? 'Obiettivo del mese' : dateRange(period.start, period.end)}</Text><Text style={[styles.periodState, { color: achieved ? colors.accent : colors.muted }]}>{achieved ? '✓ Obiettivo raggiunto' : period.end < reference ? 'Obiettivo non raggiunto' : 'In corso'}</Text></View><Text style={[styles.periodAmount, { color: colors.text }]}>{formatDurationMinutes(period.total)} / {formatDurationMinutes(period.target)}</Text></View>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}><View style={[styles.progressFill, { width: Math.min(100, period.total / period.target * 100) + '%', backgroundColor: colors.accent }]} /></View>
        <Weekdays colors={colors} />
        {weeks.map(days => <View key={days[0]}>
          {period.period === 'month' ? <Text style={[styles.weekContribution, { color: colors.muted }]}>{dateRange(days[0], days[6])} · {formatDurationMinutes(days.reduce((sum, date) => sum + (period.daily.get(date) ?? 0), 0))}</Text> : null}
          <View style={styles.days}>{days.map(date => {
            const active = date >= period.start && date <= period.end;
            const minutes = period.daily.get(date) ?? 0;
            const milestone = date === period.reachedOn;
            const selected = current?.key === period.key && current.date === date;
            return <Pressable key={date} accessibilityRole="button" accessibilityLabel={displayDate(date, { weekday: 'long', day: 'numeric', month: 'long' }) + ': ' + (minutes ? formatDurationMinutes(minutes) + (milestone ? ', obiettivo raggiunto' : '') : 'nessuna ora')} accessibilityState={{ selected }} disabled={!active} onPress={() => setChosen({ key: period.key, date })} style={[styles.dayCell, { backgroundColor: milestone ? colors.accent : minutes ? colors.soft : colors.surface, borderColor: selected ? colors.text : colors.border, opacity: active ? 1 : 0.42 }]}>
              <Text style={[styles.dayNumber, { color: milestone ? colors.accentText : colors.text }]}>{Number(date.slice(-2))}</Text>
              <Text style={[styles.dayMark, { color: milestone ? colors.accentText : minutes ? colors.accent : colors.muted }]}>{minutes ? (milestone ? '✓' : '+') + compactMinutes(minutes) : ''}</Text>
            </Pressable>;
          })}</View>
        </View>)}
      </View>;
    })}
    {current && selectedPeriod ? <Surface colors={colors}>
      <Text style={[styles.detailDate, { color: colors.accent }]}>{displayDate(current.date, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      <Text style={[styles.detailHeading, { color: colors.text }]}>{selectedMinutes ? '+' + formatDurationMinutes(selectedMinutes) + ' di ' + habit.title : 'Nessun tempo registrato'}</Text>
      <Text style={[styles.detailBody, { color: colors.muted }]}>Totale del periodo: {formatDurationMinutes(cumulative)} / {formatDurationMinutes(selectedPeriod.target)}{current.date === selectedPeriod.reachedOn ? ' · Obiettivo raggiunto oggi' : ''}</Text>
      {selectedSessions.map(session => session.notes.trim() ? <Text key={session.id} style={[styles.note, { color: colors.text }]}>{session.notes}</Text> : null)}
    </Surface> : null}
  </>;
}

const styles = StyleSheet.create({
  backButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: 13, fontWeight: '700' },
  monthNavigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  monthArrow: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  monthArrowText: { fontSize: 27 },
  monthTitle: { fontSize: 17, fontWeight: '700', textTransform: 'capitalize' },
  description: { fontSize: 14, lineHeight: 20 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendText: { fontSize: 12, fontWeight: '700' },
  weekdays: { flexDirection: 'row', marginBottom: 4 },
  weekday: { width: '14.2857%', textAlign: 'center', fontSize: 12, fontWeight: '700' },
  weekCard: { borderWidth: 1, borderRadius: 17, padding: 10, gap: 9 },
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  weekTitle: { fontSize: 13, fontWeight: '700' },
  weekTotal: { fontSize: 12, fontWeight: '700' },
  days: { flexDirection: 'row', gap: 3 },
  dayCell: { flex: 1, minWidth: 0, height: 55, borderWidth: 1, borderRadius: 10, paddingVertical: 5, alignItems: 'center', justifyContent: 'space-between' },
  dayNumber: { fontSize: 12, fontWeight: '700' },
  dayMark: { fontSize: 10, fontWeight: '800' },
  detailDate: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  detailHeading: { fontSize: 17, fontWeight: '700' },
  detailBody: { fontSize: 13, lineHeight: 19 },
  detailRow: { flexDirection: 'row', gap: 12 },
  periodHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  periodState: { fontSize: 12, fontWeight: '700', marginTop: 3 },
  periodAmount: { fontSize: 12, fontWeight: '700', maxWidth: '48%', textAlign: 'right' },
  progressTrack: { height: 6, borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  weekContribution: { fontSize: 12, marginTop: 5, marginBottom: 5 },
  note: { fontSize: 13, fontWeight: '700', lineHeight: 19 },
  flex: { flex: 1 },
});
