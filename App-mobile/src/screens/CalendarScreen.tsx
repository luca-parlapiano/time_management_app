import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { eventColors } from '../core/constants';
import { eventAppearance, occurrences } from '../core/domain/calendar';
import { addDays, displayDate, today } from '../core/utils/dates';
import { usePlanner } from '../data/PlannerProvider';
import { ActionButton, AppScreen, DatabaseGate, Surface } from '../ui/Primitives';
import { useAppColors } from '../ui/theme';

/** Agenda mobile per giorno, con le occorrenze prodotte dal calendario condiviso. */
export function CalendarScreen() {
  const { snapshot } = usePlanner();
  const colors = useAppColors();
  const [date, setDate] = useState(today());
  if (!snapshot) return <DatabaseGate><></></DatabaseGate>;
  const items = occurrences(snapshot.archive.calendar.items, date, date).filter(item => item.date === date);
  return <AppScreen eyebrow="Il tuo piano" title="Calendario">
    <View style={styles.navigation}>
      <Pressable accessibilityRole="button" accessibilityLabel="Giorno precedente" onPress={() => setDate(addDays(date, -1))} style={[styles.arrow, { backgroundColor: colors.soft }]}><Text style={[styles.arrowText, { color: colors.text }]}>‹</Text></Pressable>
      <View style={styles.date}><Text style={[styles.day, { color: colors.text }]}>{displayDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</Text><Pressable accessibilityRole="button" onPress={() => setDate(today())}><Text style={[styles.today, { color: colors.accent }]}>Vai a oggi</Text></Pressable></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Giorno successivo" onPress={() => setDate(addDays(date, 1))} style={[styles.arrow, { backgroundColor: colors.soft }]}><Text style={[styles.arrowText, { color: colors.text }]}>›</Text></Pressable>
    </View>
    {items.length === 0 ? <Surface colors={colors}><Text style={[styles.title, { color: colors.text }]}>Nessun impegno in programma</Text><Text style={[styles.muted, { color: colors.muted }]}>Le occorrenze delle abitudini compariranno qui.</Text><ActionButton label="Nuova abitudine" onPress={() => router.push('/new-habit')} /></Surface>
      : items.map(item => {
        const appearance = eventAppearance(item);
        return <Surface key={item.id} colors={colors}><View style={styles.row}><View style={[styles.mark, { backgroundColor: eventColors[appearance.color].value }]} /><View style={styles.flex}><Text style={[styles.title, { color: colors.text }]}>{item.title}</Text><Text style={[styles.muted, { color: colors.muted }]}>{item.start}–{item.end} · {item.habitId ? 'Abitudine' : item.kind === 'fixed' ? 'Impegno fisso' : item.kind === 'protected' ? 'Tempo protetto' : 'Attività'}</Text></View></View>{item.outcome && <Text style={[styles.outcome, { color: item.outcome === 'completed' ? colors.accent : colors.muted }]}>{item.outcome === 'completed' ? '✓ Fatto' : '× Non fatto'}</Text>}</Surface>;
      })}
  </AppScreen>;
}

const styles = StyleSheet.create({
  navigation: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  date: { flex: 1, alignItems: 'center', gap: 4 },
  day: { fontSize: 15, fontWeight: '700', textAlign: 'center', textTransform: 'capitalize' },
  today: { fontSize: 12, fontWeight: '700' },
  arrow: { width: 47, height: 47, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 29 },
  row: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  mark: { width: 8, height: 40, borderRadius: 5 },
  flex: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700' },
  muted: { fontSize: 13, lineHeight: 19 },
  outcome: { fontSize: 12, fontWeight: '700' },
});
