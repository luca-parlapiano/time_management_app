import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { eventColorValue } from '../core/constants';
import { displayDate, today } from '../core/utils/dates';
import { formatDurationMinutes } from '../core/utils/time';
import { usePlanner } from '../data/PlannerProvider';
import { EventIcon } from '../ui/EventIcon';
import { HabitIconBadge } from '../ui/HabitIconBadge';
import { AppScreen, DatabaseGate, Surface } from '../ui/Primitives';
import type { AppColors } from '../ui/theme';
import { useAppColors } from '../ui/theme';
import { completedTimeSeries, recentSeriesMonths } from './progressData';
import type { CompletedSeries } from './progressData';

type ProgressTab = 'summary' | 'habits' | 'archive';

function monthLabel(key: string, short = false): string {
  const date = new Date(`${key}-01T00:00:00Z`);
  const label = new Intl.DateTimeFormat('it-IT', { month: short ? 'short' : 'long', ...(short ? {} : { year: 'numeric' }), timeZone: 'UTC' }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function seriesPeriod(entry: CompletedSeries): string {
  return `${displayDate(entry.result.series.startsOn, { month: 'short' })} – ${displayDate(entry.closedOn, { month: 'short', year: 'numeric' })}`;
}

function ProgressTrack({ completed, target, colors }: { completed: number; target: number; colors: AppColors }) {
  const percent = target > 0 ? Math.min(100, completed / target * 100) : 0;
  return <View style={[styles.track, { backgroundColor: colors.border }]} accessibilityLabel={`${Math.round(percent)}% dell'obiettivo`}>
    <View style={[styles.trackFill, { width: `${percent}%`, backgroundColor: colors.accent }]} />
  </View>;
}

function SectionTitle({ title, trailing, colors }: { title: string; trailing?: string; colors: AppColors }) {
  return <View style={styles.sectionTitle}><Text style={[styles.sectionHeading, { color: colors.text }]}>{title}</Text>{trailing ? <Text style={[styles.sectionTrailing, { color: colors.muted }]}>{trailing}</Text> : null}</View>;
}

/** Mostra le serie confermate in tre viste: andamento, abitudini attive e storico consultabile. */
export function ProgressScreen() {
  const { snapshot, statistics } = usePlanner();
  const colors = useAppColors();
  const [tab, setTab] = useState<ProgressTab>('summary');
  const [selectedMonth, setSelectedMonth] = useState(() => today().slice(0, 7));
  const [visibleCount, setVisibleCount] = useState(8);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);
  const reference = today();
  const completed = useMemo(() => statistics ? completedTimeSeries(statistics.getTimeSeriesResults(reference), reference) : [], [statistics, reference]);
  const months = useMemo(() => recentSeriesMonths(completed, reference), [completed, reference]);
  if (!snapshot || !statistics) return <DatabaseGate><></></DatabaseGate>;

  const latest = completed[0];
  const activeMonth = months.find(month => month.key === selectedMonth) ?? months.at(-1)!;
  const chartMax = Math.max(1, ...months.map(month => month.concluded));
  const activeHabits = (snapshot.archive.weeklyTimeHabits ?? []).filter(habit => !habit.archivedOn);
  const visibleArchive = completed.slice(0, visibleCount);
  const visibleArchiveMonths = [...new Set(visibleArchive.map(entry => entry.closedOn.slice(0, 7)))];
  const selectedSeries = completed.find(entry => entry.key === selectedSeriesKey);
  const sessions = selectedSeries ? statistics.getTimeSessions(selectedSeries.result.habit.id, selectedSeries.result.series.startsOn, selectedSeries.result.series.endsOn, selectedSeries.result.series.id).filter(session => session.date <= reference) : [];
  const openSeries = (entry: CompletedSeries) => { setSelectedSeriesKey(entry.key); setTab('archive'); };
  const selectTab = (next: ProgressTab) => { setTab(next); if (next === 'archive') setSelectedSeriesKey(null); };

  return <AppScreen eyebrow="Il tuo percorso" title="Progressi">
    <View style={[styles.tabs, { backgroundColor: colors.soft }]} accessibilityRole="tablist">
      {([['summary', 'Riepilogo'], ['habits', 'Per abitudine'], ['archive', 'Archivio']] as const).map(([key, label]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: tab === key }} onPress={() => selectTab(key)} style={[styles.tab, tab === key && { backgroundColor: colors.surface }]}>
        <Text style={[styles.tabText, { color: tab === key ? colors.accent : colors.muted }]}>{label}</Text>
      </Pressable>)}
    </View>

    {tab === 'summary' && <>
      {latest ? <View style={[styles.hero, { backgroundColor: colors.soft, borderColor: colors.border }]}>
        <View style={styles.heroTop}><Text style={[styles.overline, { color: colors.muted }]}>ULTIMA SERIE CONCLUSA</Text><Text style={[styles.status, { color: latest.result.reached ? colors.accent : colors.muted, backgroundColor: colors.surface }]}>{latest.result.reached ? '✓ Raggiunta' : 'Sotto obiettivo'}</Text></View>
        <View style={styles.detailHeading}><HabitIconBadge icon={latest.result.habit.icon} color={latest.result.habit.color} backgroundColor={colors.surface} /><Text style={[styles.heroTitle, { color: colors.text }]}>{latest.result.habit.title}</Text></View>
        <Text style={[styles.muted, { color: colors.muted }]}>{seriesPeriod(latest)} · {latest.result.series.period === 'month' ? 'Serie mensile' : 'Serie settimanale'}</Text>
        <View style={styles.heroValue}><Text style={[styles.bigValue, { color: colors.text }]}>{formatDurationMinutes(latest.result.completedMinutes)}</Text><Text style={[styles.muted, { color: colors.muted }]}>su {formatDurationMinutes(latest.result.series.targetMinutes)}</Text></View>
        <ProgressTrack completed={latest.result.completedMinutes} target={latest.result.series.targetMinutes} colors={colors} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Apri il diario di ${latest.result.habit.title}`} onPress={() => openSeries(latest)}><Text style={[styles.link, { color: colors.accent }]}>Apri diario →</Text></Pressable>
      </View> : <Surface colors={colors}><Text style={[styles.sectionHeading, { color: colors.text }]}>La tua prima serie comparirà qui</Text><Text style={[styles.muted, { color: colors.muted }]}>Concludi una serie a tempo per iniziare a vedere i tuoi progressi.</Text></Surface>}

      <SectionTitle title="Le tue serie" trailing={monthLabel(activeMonth.key)} colors={colors} />
      <View style={styles.metrics}>
        {[[String(activeMonth.concluded), 'concluse'], [String(activeMonth.reached), 'raggiunte'], [formatDurationMinutes(activeMonth.minutes), 'tempo svolto']].map(([value, label]) => <View key={label} style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text><Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text></View>)}
      </View>
      <Surface colors={colors}>
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Serie negli ultimi 6 mesi</Text>
        <View style={styles.legend}><View style={[styles.legendDot, { backgroundColor: colors.accent }]} /><Text style={[styles.legendText, { color: colors.muted }]}>Obiettivo raggiunto</Text><View style={[styles.legendDot, { backgroundColor: colors.muted }]} /><Text style={[styles.legendText, { color: colors.muted }]}>Sotto obiettivo</Text></View>
        <View style={styles.chart}>{months.map(month => {
          const below = month.concluded - month.reached;
          const selected = month.key === activeMonth.key;
          return <Pressable key={month.key} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${monthLabel(month.key)}, ${month.concluded} serie concluse, ${month.reached} raggiunte`} onPress={() => setSelectedMonth(month.key)} style={styles.chartColumn}>
            <View style={[styles.chartBar, { backgroundColor: colors.soft }]}>
              {below > 0 && <View style={{ height: below / chartMax * 108, backgroundColor: colors.muted }} />}
              {month.reached > 0 && <View style={{ height: month.reached / chartMax * 108, backgroundColor: colors.accent }} />}
            </View>
            <Text style={[styles.chartLabel, { color: selected ? colors.text : colors.muted, fontWeight: selected ? '800' : '500' }]}>{monthLabel(month.key, true)}</Text>
          </Pressable>;
        })}</View>
        <Text style={[styles.chartCaption, { color: colors.text, backgroundColor: colors.soft }]}>{monthLabel(activeMonth.key)} · {activeMonth.concluded} serie concluse · {activeMonth.reached} raggiunte</Text>
      </Surface>
    </>}

    {tab === 'habits' && <>
      <SectionTitle title="Ultima serie per abitudine" trailing={`${activeHabits.length} attive`} colors={colors} />
      <Text style={[styles.muted, { color: colors.muted }]}>Le barre confrontano il tempo svolto con l’obiettivo di ogni serie.</Text>
      {activeHabits.length === 0 ? <Surface colors={colors}><Text style={[styles.muted, { color: colors.muted }]}>Non ci sono abitudini a tempo attive.</Text></Surface> : activeHabits.map(habit => {
        const entry = completed.find(item => item.result.habit.id === habit.id);
        return <Pressable key={habit.id} accessibilityRole="button" disabled={!entry} accessibilityLabel={entry ? `Apri l'ultima serie di ${habit.title}` : `${habit.title}, nessuna serie conclusa`} onPress={() => { if (entry) openSeries(entry); }} style={[styles.habitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.habitCardTop}><View style={styles.habitIdentity}><HabitIconBadge icon={habit.icon} color={habit.color} backgroundColor={colors.soft} /><Text style={[styles.habitTitle, { color: colors.text }]}>{habit.title}</Text></View><Text style={[styles.habitStatus, { color: entry?.result.reached ? colors.accent : colors.muted }]}>{entry ? entry.result.reached ? '✓' : `${Math.round(entry.result.completedMinutes / entry.result.series.targetMinutes * 100)}%` : '—'}</Text></View>
          <Text style={[styles.muted, { color: colors.muted }]}>{entry ? `${seriesPeriod(entry)} · ${formatDurationMinutes(entry.result.completedMinutes)} / ${formatDurationMinutes(entry.result.series.targetMinutes)}` : 'Nessuna serie conclusa'}</Text>
          {entry && <ProgressTrack completed={entry.result.completedMinutes} target={entry.result.series.targetMinutes} colors={colors} />}
        </Pressable>;
      })}
    </>}

    {tab === 'archive' && (selectedSeries ? <>
      <Pressable accessibilityRole="button" onPress={() => setSelectedSeriesKey(null)}><Text style={[styles.link, { color: colors.accent }]}>← Tutte le serie</Text></Pressable>
      <View style={[styles.hero, { backgroundColor: colors.soft, borderColor: eventColorValue(selectedSeries.result.habit.color), borderWidth: 2 }]}>
        <Text style={[styles.overline, { color: colors.muted }]}>SERIE CONCLUSA</Text>
        <View style={styles.detailHeading}><View style={[styles.archiveIcon, { backgroundColor: colors.surface }]}><EventIcon icon={selectedSeries.result.habit.icon} color={eventColorValue(selectedSeries.result.habit.color)} /></View><Text style={[styles.heroTitle, { color: colors.text }]}>{selectedSeries.result.habit.title}</Text></View>
        <Text style={[styles.muted, { color: colors.muted }]}>{seriesPeriod(selectedSeries)} · {selectedSeries.result.series.period === 'month' ? 'Serie mensile' : 'Serie settimanale'}</Text>
        <View style={styles.heroValue}><Text style={[styles.bigValue, { color: colors.text }]}>{formatDurationMinutes(selectedSeries.result.completedMinutes)}</Text><Text style={[styles.muted, { color: colors.muted }]}>su {formatDurationMinutes(selectedSeries.result.series.targetMinutes)}</Text></View>
        <ProgressTrack completed={selectedSeries.result.completedMinutes} target={selectedSeries.result.series.targetMinutes} colors={colors} />
        <Text style={[styles.muted, { color: selectedSeries.result.reached ? colors.accent : colors.muted }]}>{selectedSeries.result.reached ? 'Obiettivo raggiunto' : 'Sotto obiettivo'}</Text>
      </View>
      <SectionTitle title="Diario della serie" colors={colors} />
      {sessions.length === 0 ? <Surface colors={colors}><Text style={[styles.muted, { color: colors.muted }]}>Nessuna registrazione per questa serie.</Text></Surface> : [...sessions].reverse().map(session => <View key={session.id} style={[styles.sessionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sessionTop}><Text style={[styles.sessionDate, { color: colors.muted }]}>{displayDate(session.date, { weekday: 'short', month: 'short', year: 'numeric' })}</Text><Text style={[styles.sessionDuration, { color: session.removed ? colors.muted : colors.accent }]}>{formatDurationMinutes(session.minutes)}{session.removed ? ' · Rimossa' : ''}</Text></View>
        {session.notes.trim() ? <Text style={[styles.sessionNote, { color: session.removed ? colors.muted : colors.text }]}>{session.notes}</Text> : <Text style={[styles.muted, { color: colors.muted }]}>Nessuna nota</Text>}
      </View>)}
    </> : <>
      <SectionTitle title="Serie concluse" trailing={`${completed.length} serie`} colors={colors} />
      <Text style={[styles.muted, { color: colors.muted }]}>Tutti i periodi confermati, anche delle abitudini non più attive.</Text>
      {completed.length === 0 ? <Surface colors={colors}><Text style={[styles.muted, { color: colors.muted }]}>Le serie concluse compariranno qui.</Text></Surface> : visibleArchiveMonths.map(month => <View key={month} style={styles.archiveGroup}>
        <SectionTitle title={monthLabel(month)} colors={colors} />
        {visibleArchive.filter(entry => entry.closedOn.startsWith(month)).map(entry => <Pressable key={entry.key} accessibilityRole="button" accessibilityLabel={`Apri ${entry.result.habit.title}, serie ${entry.result.series.period === 'month' ? 'mensile' : 'settimanale'}, ${seriesPeriod(entry)}, ${entry.result.reached ? 'obiettivo raggiunto' : 'sotto obiettivo'}`} onPress={() => setSelectedSeriesKey(entry.key)} style={[styles.archiveRow, { backgroundColor: colors.surface, borderColor: eventColorValue(entry.result.habit.color) }]}>
          <View style={[styles.archiveIcon, { backgroundColor: colors.soft }]}><EventIcon icon={entry.result.habit.icon} color={eventColorValue(entry.result.habit.color)} /></View>
          <View style={styles.archiveRowText}><Text style={[styles.habitTitle, { color: colors.text }]}>{entry.result.habit.title}</Text><Text style={[styles.muted, { color: colors.muted }]}>{seriesPeriod(entry)} · {entry.result.series.period === 'month' ? 'Mensile' : 'Settimanale'}</Text><Text style={[styles.muted, { color: colors.muted }]}>{formatDurationMinutes(entry.result.completedMinutes)} / {formatDurationMinutes(entry.result.series.targetMinutes)}</Text></View>
          <Text style={[styles.archiveArrow, { color: colors.muted }]}>›</Text>
        </Pressable>)}
      </View>)}
      {completed.length > visibleCount && <Pressable accessibilityRole="button" onPress={() => setVisibleCount(count => count + 8)}><Text style={[styles.more, { color: colors.accent }]}>Mostra altre serie</Text></Pressable>}
    </>)}
  </AppScreen>;
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 14, gap: 4 },
  tab: { flex: 1, minHeight: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabText: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  hero: { borderWidth: 1, borderRadius: 19, padding: 17, gap: 11 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  overline: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  status: { fontSize: 11, fontWeight: '800', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  heroTitle: { fontSize: 22, fontWeight: '800', flexShrink: 1 },
  detailHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroValue: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  bigValue: { fontSize: 28, fontWeight: '800' },
  muted: { fontSize: 13, lineHeight: 19 },
  link: { fontSize: 14, fontWeight: '800', paddingVertical: 5 },
  track: { height: 10, borderRadius: 8, overflow: 'hidden' },
  trackFill: { height: 10, borderRadius: 8 },
  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 7 },
  sectionHeading: { fontSize: 18, fontWeight: '800', flexShrink: 1 },
  sectionTrailing: { fontSize: 12, fontWeight: '600' },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 11, gap: 4, minWidth: 0 },
  metricValue: { fontSize: 19, fontWeight: '800' },
  metricLabel: { fontSize: 11, lineHeight: 14 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, marginRight: 5 },
  chart: { flexDirection: 'row', gap: 5 },
  chartColumn: { flex: 1, alignItems: 'center', gap: 6, minWidth: 0 },
  chartBar: { width: '100%', height: 108, borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' },
  chartLabel: { fontSize: 11, textAlign: 'center' },
  chartCaption: { fontSize: 12, borderRadius: 10, padding: 9 },
  habitCard: { borderWidth: 1, borderRadius: 15, padding: 14, gap: 9 },
  habitCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  habitIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  habitTitle: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
  habitStatus: { fontSize: 14, fontWeight: '800' },
  archiveGroup: { gap: 8 },
  archiveRow: { borderWidth: 2, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  archiveIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  archiveRowText: { flex: 1, gap: 3 },
  archiveArrow: { fontSize: 20, fontWeight: '700' },
  more: { textAlign: 'center', fontSize: 14, fontWeight: '800', paddingVertical: 10 },
  sessionCard: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 7 },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  sessionDate: { fontSize: 12 },
  sessionDuration: { fontSize: 13, fontWeight: '800' },
  sessionNote: { fontSize: 14, lineHeight: 20 },
});
