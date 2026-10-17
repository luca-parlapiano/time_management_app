import { StyleSheet, Text, View } from 'react-native';
import { eventColors } from '../core/constants';
import { displayDate, today } from '../core/utils/dates';
import { formatDurationMinutes } from '../core/utils/time';
import { usePlanner } from '../data/PlannerProvider';
import { AppScreen, DatabaseGate, Surface } from '../ui/Primitives';
import { useAppColors } from '../ui/theme';

/** Riepilogo dei risultati confermati. */
export function ProgressScreen() {
  const { snapshot, statistics } = usePlanner();
  const colors = useAppColors();
  if (!snapshot || !statistics) return <DatabaseGate><></></DatabaseGate>;
  const date = today();
  const daily = statistics.getDailyStatistics(date);
  return <AppScreen eyebrow="Risultati confermati" title="Progressi">
    <Surface colors={colors}>
      <Text style={[styles.label, { color: colors.muted }]}>Oggi · {displayDate(date)}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{daily.total ? `${daily.completed} / ${daily.total}` : 'Giornata libera'}</Text>
      {daily.total > 0 && <Text style={[styles.muted, { color: colors.muted }]}>{daily.recorded ? `${daily.completed} fatte · ${daily.skipped} non fatte · ${daily.pending} senza esito` : 'Nessun esito registrato'}</Text>}
      {daily.total > 0 && (daily.recorded > 0 ? <View style={[styles.bar, { backgroundColor: colors.border }]}>{daily.activities.filter(activity => activity.completed > 0).map(activity => <View key={activity.key} style={{ width: `${activity.contributionPercent}%`, height: 12, backgroundColor: eventColors[activity.color].value }} />)}</View> : <View style={styles.dots}>{daily.activities.map(activity => <View key={activity.key} style={[styles.dot, { backgroundColor: eventColors[activity.color].value }]} />)}</View>)}
    </Surface>
    <Surface colors={colors}><Text style={[styles.label, { color: colors.muted }]}>Tempo registrato questa settimana</Text><Text style={[styles.value, { color: colors.text }]}>{formatDurationMinutes(statistics.getTimeWeekMinutes(date))}</Text></Surface>
  </AppScreen>;
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  value: { fontSize: 30, fontWeight: '800' },
  muted: { fontSize: 13, lineHeight: 19 },
  bar: { flexDirection: 'row', height: 12, borderRadius: 8, overflow: 'hidden', marginTop: 7 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dot: { width: 11, height: 11, borderRadius: 6 },
});
