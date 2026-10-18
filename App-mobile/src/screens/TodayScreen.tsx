import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { eventColorValue } from '../core/constants';
import { eventAppearance, todayOccurrences } from '../core/domain/calendar';
import type { ItemOutcome, Occurrence } from '../core/model/calendar';
import { displayDate, today } from '../core/utils/dates';
import { formatDurationMinutes } from '../core/utils/time';
import { usePlanner } from '../data/PlannerProvider';
import { HabitIconBadge } from '../ui/HabitIconBadge';
import { AppScreen, DatabaseGate, Surface } from '../ui/Primitives';
import { useAppColors } from '../ui/theme';

/** Dashboard della giornata con esiti e progressi calcolati dal dominio desktop. */
export function TodayScreen() {
  const { snapshot, statistics, recordOutcome, saving } = usePlanner();
  const colors = useAppColors();
  const [actionError, setActionError] = useState<string | null>(null);
  if (!snapshot || !statistics) return <DatabaseGate><></></DatabaseGate>;
  const date = today();
  const events = todayOccurrences(snapshot.archive.calendar.items, date);
  const daily = statistics.getDailyStatistics(date);
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dashboard = statistics.getHabitDashboard(date, time);
  const activeTimeHabits = (snapshot.archive.weeklyTimeHabits ?? []).filter(habit => !habit.archivedOn);
  const next = events.find(item => !item.outcome && item.start >= time);
  const nextAppearance = next ? eventAppearance(next) : null;
  const mark = (item: Occurrence, outcome: ItemOutcome) => {
    void recordOutcome(item, outcome).then(() => setActionError(null)).catch(cause => {
      setActionError(cause instanceof Error ? cause.message : 'Impossibile registrare l’esito.');
    });
  };
  return <AppScreen eyebrow={displayDate(date, { weekday: 'long', day: 'numeric', month: 'long' })} title="La tua giornata">
    <View style={[styles.hero, { backgroundColor: colors.soft }]}>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>Il tuo passo di oggi</Text>
      <View style={styles.heroHeading}>{nextAppearance && <HabitIconBadge icon={nextAppearance.icon} color={nextAppearance.color} backgroundColor={colors.surface} />}<Text style={[styles.heroTitle, { color: colors.text }]}>{next ? next.title : 'Un passo alla volta'}</Text></View>
      <Text style={[styles.secondary, { color: colors.muted }]}>{next ? `${next.start}–${next.end} · Prossima attività` : 'Scegli il prossimo obiettivo al tuo ritmo.'}</Text>
      {daily.total > 0 && (daily.recorded > 0
        ? <><View style={[styles.progressTrack, { backgroundColor: colors.border }]}><View style={[styles.progressFill, { width: `${daily.completed / daily.total * 100}%`, backgroundColor: colors.accent }]} /></View><Text style={[styles.secondary, { color: colors.muted }]}>{daily.completed} di {daily.total} fatte · {daily.pending} senza esito</Text></>
        : <View style={styles.dots}>{daily.activities.map(activity => <View key={activity.key} accessibilityLabel={activity.title} style={[styles.dot, { backgroundColor: eventColorValue(activity.color) }]} />)}<Text style={[styles.secondary, { color: colors.muted }]}>Nessun esito registrato</Text></View>)}
    </View>

    <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>Il piano di oggi</Text><Pressable onPress={() => router.push('/calendar')} accessibilityRole="button"><Text style={[styles.link, { color: colors.accent }]}>Calendario →</Text></Pressable></View>
    {events.length === 0 ? <Surface colors={colors}><Text style={[styles.itemTitle, { color: colors.text }]}>Nessuna attività da seguire</Text><Text style={[styles.secondary, { color: colors.muted }]}>Tocca + in basso per creare il tuo primo percorso.</Text></Surface> :
      events.map(item => {
        const appearance = eventAppearance(item);
        return <Surface key={item.id} colors={colors}>
          <View style={styles.activityHeading}><HabitIconBadge icon={appearance.icon} color={appearance.color} backgroundColor={colors.soft} /><View style={styles.activityText}><Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.secondary, { color: colors.muted }]}>{item.start}–{item.end} · {item.habitId ? 'Abitudine' : 'Attività monitorata'}</Text></View></View>
          <View style={styles.outcomeRow}><Pressable disabled={saving} accessibilityRole="button" accessibilityState={{ selected: item.outcome === 'completed' }} onPress={() => mark(item, 'completed')} style={[styles.outcomeButton, { borderColor: colors.accent, backgroundColor: item.outcome === 'completed' ? colors.accent : colors.surface }]}><Text style={{ color: item.outcome === 'completed' ? colors.accentText : colors.accent, fontWeight: '700' }}>✓ Fatto</Text></Pressable><Pressable disabled={saving} accessibilityRole="button" accessibilityState={{ selected: item.outcome === 'skipped' }} onPress={() => mark(item, 'skipped')} style={[styles.outcomeButton, { borderColor: colors.border, backgroundColor: item.outcome === 'skipped' ? colors.soft : colors.surface }]}><Text style={{ color: colors.text, fontWeight: '700' }}>× Non fatto</Text></Pressable></View>
        </Surface>;
      })}
    {actionError && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{actionError}</Text>}

    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 10 }]}>I tuoi percorsi</Text>
    {dashboard.rows.length === 0 && activeTimeHabits.length === 0 ? <Text style={[styles.secondary, { color: colors.muted }]}>I progressi delle abitudini appariranno qui.</Text> : <>
      {dashboard.rows.slice(0, 2).map(row => <Surface key={row.habit.id} colors={colors}><Pressable accessibilityRole="button" accessibilityLabel={`Apri ${row.habit.title} nelle abitudini a step`} onPress={() => router.push({ pathname: '/habits', params: { mode: 'steps', habitId: row.habit.id } })} style={styles.pathCard}><View style={styles.pathHeading}><View style={styles.pathIdentity}><HabitIconBadge icon={row.habit.icon} color={row.habit.color} backgroundColor={colors.soft} /><Text style={[styles.itemTitle, styles.pathTitle, { color: colors.text }]}>{row.habit.title}</Text></View><Text style={[styles.link, { color: colors.accent }]}>Apri ›</Text></View><Text style={[styles.secondary, { color: colors.muted }]}>{row.journey.currentStep} di {row.journey.target} step valutati · {row.journey.completed} fatti</Text><View style={[styles.progressTrack, { backgroundColor: colors.border }]}><View style={[styles.progressFill, { backgroundColor: eventColorValue(row.habit.color), width: `${row.journey.currentStep / row.journey.target * 100}%` }]} /></View></Pressable></Surface>)}
      {activeTimeHabits.map(habit => {
        const totalMinutes = habit.startsOn <= date ? statistics.getTimeSessions(habit.id, habit.startsOn, date)
          .filter(session => !session.removed).reduce((total, session) => total + session.minutes, 0) : 0;
        const progress = statistics.getWeeklyTimeProgress(habit.id, date);
        return <Surface key={habit.id} colors={colors}><Pressable accessibilityRole="button" accessibilityLabel={`Apri ${habit.title} nelle abitudini a ore`} onPress={() => router.push({ pathname: '/habits', params: { mode: 'hours', habitId: habit.id } })} style={styles.pathCard}><View style={styles.pathHeading}><View style={styles.pathIdentity}><HabitIconBadge icon={habit.icon} color={habit.color} backgroundColor={colors.soft} /><Text style={[styles.itemTitle, styles.pathTitle, { color: colors.text }]}>{habit.title}</Text></View><Text style={[styles.link, { color: colors.accent }]}>Apri ›</Text></View><Text style={[styles.totalTime, { color: colors.text }]}>Totale svolto: {formatDurationMinutes(totalMinutes)}</Text><Text style={[styles.secondary, { color: colors.muted }]}>{progress.period === 'month' ? 'Questo mese' : 'Questa settimana'}: {formatDurationMinutes(progress.completedMinutes)}</Text></Pressable></Surface>;
      })}
    </>}
  </AppScreen>;
}

const styles = StyleSheet.create({
  hero: { padding: 21, borderRadius: 24, gap: 9 },
  heroHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  heroTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4, flexShrink: 1 },
  secondary: { fontSize: 13, lineHeight: 19 },
  progressTrack: { height: 10, borderRadius: 99, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: 10, borderRadius: 99 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  dot: { width: 11, height: 11, borderRadius: 6 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  sectionTitle: { fontSize: 19, fontWeight: '800' },
  link: { fontSize: 13, fontWeight: '700' },
  itemTitle: { fontSize: 16, fontWeight: '700' },
  pathCard: { gap: 10 },
  pathHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  pathIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pathTitle: { flexShrink: 1 },
  totalTime: { fontSize: 15, fontWeight: '700' },
  activityHeading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  activityText: { flex: 1, gap: 2 },
  outcomeRow: { flexDirection: 'row', gap: 9, marginTop: 4 },
  outcomeButton: { flex: 1, minHeight: 43, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12 },
});
