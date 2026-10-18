import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { eventColorValue } from '../core/constants';
import { eventAppearance, occurrences } from '../core/domain/calendar';
import { addDays, displayDate, today } from '../core/utils/dates';
import { formatDurationMinutes } from '../core/utils/time';
import { usePlanner } from '../data/PlannerProvider';
import { AppScreen, DatabaseGate, Surface } from '../ui/Primitives';
import { HabitIconBadge } from '../ui/HabitIconBadge';
import { useAppColors } from '../ui/theme';
import { HabitCalendarMatrix } from './HabitCalendarMatrix';

type Selection = { kind: 'steps' | 'hours'; id: string } | { kind: 'agenda' } | null;

/** Elenco dei percorsi, matrice per abitudine e accesso all'agenda giornaliera. */
export function CalendarScreen() {
  const { snapshot, statistics } = usePlanner();
  const colors = useAppColors();
  const [date, setDate] = useState(today());
  const [selection, setSelection] = useState<Selection>(null);
  if (!snapshot || !statistics) return <DatabaseGate><></></DatabaseGate>;
  const archive = snapshot.archive;
  const reference = today();
  if (selection?.kind === 'steps' || selection?.kind === 'hours') {
    const exists = selection.kind === 'steps'
      ? archive.habits?.some(habit => habit.id === selection.id)
      : archive.weeklyTimeHabits?.some(habit => habit.id === selection.id);
    if (exists) return <HabitCalendarMatrix kind={selection.kind} id={selection.id} onBack={() => setSelection(null)} />;
  }
  if (!selection || selection.kind !== 'agenda') {
    const stepHabits = archive.habits ?? [];
    const timeHabits = archive.weeklyTimeHabits ?? [];
    return <AppScreen eyebrow="Il tuo piano" title="Calendario">
      <Text style={[styles.intro, { color: colors.muted }]}>Scegli un’abitudine per vedere come procede sul calendario.</Text>
      {stepHabits.length === 0 && timeHabits.length === 0 ? <Surface colors={colors}><Text style={[styles.title, { color: colors.text }]}>Nessuna abitudine ancora</Text><Text style={[styles.muted, { color: colors.muted }]}>Crea un percorso con il tasto + per iniziare.</Text></Surface> : null}
      {stepHabits.map(habit => {
        const progress = statistics.getHabitProgress(habit.id);
        const closedOn = statistics.getHabitCompletionDate(habit.id);
        const completedSteps = progress.stepOutcomes.filter(outcome => outcome === 'completed').length;
        const successful = Boolean(closedOn && progress.stepOutcomes.length === progress.target && progress.stepOutcomes.every(outcome => outcome === 'completed'));
        const summary = closedOn
          ? successful ? 'Completata con successo' : 'Serie conclusa · ' + completedSteps + ' fatti'
          : progress.currentStep + '/' + progress.target + ' step valutati · ' + completedSteps + ' fatti';
        return <Surface key={habit.id} colors={colors}><Pressable accessibilityRole="button" accessibilityLabel={'Apri il calendario di ' + habit.title + ', abitudine a step'} onPress={() => setSelection({ kind: 'steps', id: habit.id })} style={styles.cardButton}>
          <View style={styles.row}><HabitIconBadge icon={habit.icon} color={habit.color} backgroundColor={colors.soft} /><View style={styles.flex}><Text style={[styles.title, { color: colors.text }]}>{habit.title}</Text><Text style={[styles.muted, { color: colors.muted }]}>A step · {summary}</Text></View><Text style={[styles.chevron, { color: colors.accent }]}>›</Text></View>
          <View style={[styles.track, { backgroundColor: colors.border }]}><View style={[styles.fill, { width: Math.min(100, progress.currentStep / progress.target * 100) + '%', backgroundColor: eventColorValue(habit.color) }]} /></View>
        </Pressable></Surface>;
      })}
      {timeHabits.map(habit => {
        const progress = statistics.getWeeklyTimeProgress(habit.id, reference);
        const latest = Boolean(habit.archivedOn || progress.end < reference);
        const period = progress.period === 'month' ? latest ? 'Ultimo mese' : 'Questo mese' : latest ? 'Ultima settimana' : 'Questa settimana';
        const summary = habit.archivedOn ? 'Archiviata' : progress.state === 'reached' ? '✓ Obiettivo raggiunto' : formatDurationMinutes(progress.completedMinutes) + ' / ' + formatDurationMinutes(progress.targetMinutes);
        return <Surface key={habit.id} colors={colors}><Pressable accessibilityRole="button" accessibilityLabel={'Apri il calendario di ' + habit.title + ', obiettivo a ore'} onPress={() => setSelection({ kind: 'hours', id: habit.id })} style={styles.cardButton}>
          <View style={styles.row}><HabitIconBadge icon={habit.icon} color={habit.color} backgroundColor={colors.soft} /><View style={styles.flex}><Text style={[styles.title, { color: colors.text }]}>{habit.title}</Text><Text style={[styles.muted, { color: colors.muted }]}>{period} · {summary}</Text></View><Text style={[styles.chevron, { color: colors.accent }]}>›</Text></View>
          <View style={[styles.track, { backgroundColor: colors.border }]}><View style={[styles.fill, { width: Math.min(100, progress.percent) + '%', backgroundColor: eventColorValue(habit.color) }]} /></View>
        </Pressable></Surface>;
      })}
      <Pressable accessibilityRole="button" onPress={() => { setDate(today()); setSelection({ kind: 'agenda' }); }} style={[styles.agendaLink, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={[styles.agendaText, { color: colors.text }]}>Apri l’agenda del giorno</Text><Text style={[styles.chevron, { color: colors.accent }]}>›</Text></Pressable>
    </AppScreen>;
  }
  const items = occurrences(snapshot.archive.calendar.items, date, date).filter(item => item.date === date);
  return <AppScreen eyebrow="Il tuo piano" title="Agenda">
    <Pressable accessibilityRole="button" accessibilityLabel="Torna alle abitudini" onPress={() => setSelection(null)} style={styles.backButton}><Text style={[styles.today, { color: colors.accent }]}>‹ Tutte le abitudini</Text></Pressable>
    <View style={styles.navigation}>
      <Pressable accessibilityRole="button" accessibilityLabel="Giorno precedente" onPress={() => setDate(addDays(date, -1))} style={[styles.arrow, { backgroundColor: colors.soft }]}><Text style={[styles.arrowText, { color: colors.text }]}>‹</Text></Pressable>
      <View style={styles.date}><Text style={[styles.day, { color: colors.text }]}>{displayDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</Text><Pressable accessibilityRole="button" onPress={() => setDate(today())}><Text style={[styles.today, { color: colors.accent }]}>Vai a oggi</Text></Pressable></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Giorno successivo" onPress={() => setDate(addDays(date, 1))} style={[styles.arrow, { backgroundColor: colors.soft }]}><Text style={[styles.arrowText, { color: colors.text }]}>›</Text></Pressable>
    </View>
    {items.length === 0 ? <Surface colors={colors}><Text style={[styles.title, { color: colors.text }]}>Nessun impegno in programma</Text><Text style={[styles.muted, { color: colors.muted }]}>Tocca + in basso per iniziare un nuovo percorso.</Text></Surface>
      : items.map(item => {
        const appearance = eventAppearance(item);
        return <Surface key={item.id} colors={colors}><View style={styles.row}><HabitIconBadge icon={appearance.icon} color={appearance.color} backgroundColor={colors.soft} /><View style={styles.flex}><Text style={[styles.title, { color: colors.text }]}>{item.title}</Text><Text style={[styles.muted, { color: colors.muted }]}>{item.start}–{item.end} · {item.habitId ? 'Abitudine' : item.kind === 'fixed' ? 'Impegno fisso' : item.kind === 'protected' ? 'Tempo protetto' : 'Attività'}</Text></View></View>{item.outcome && <Text style={[styles.outcome, { color: item.outcome === 'completed' ? colors.accent : colors.muted }]}>{item.outcome === 'completed' ? '✓ Fatto' : '× Non fatto'}</Text>}</Surface>;
      })}
  </AppScreen>;
}

const styles = StyleSheet.create({
  intro: { fontSize: 15, lineHeight: 21, marginBottom: 4 },
  chevron: { fontSize: 28, fontWeight: '600' },
  cardButton: { gap: 13, minHeight: 64 },
  track: { height: 7, borderRadius: 7, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 7 },
  agendaLink: { minHeight: 56, borderWidth: 1, borderRadius: 17, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  agendaText: { fontSize: 15, fontWeight: '700' },
  backButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  navigation: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  date: { flex: 1, alignItems: 'center', gap: 4 },
  day: { fontSize: 15, fontWeight: '700', textAlign: 'center', textTransform: 'capitalize' },
  today: { fontSize: 12, fontWeight: '700' },
  arrow: { width: 47, height: 47, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 29 },
  row: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  flex: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700' },
  muted: { fontSize: 13, lineHeight: 19 },
  outcome: { fontSize: 12, fontWeight: '700' },
});
