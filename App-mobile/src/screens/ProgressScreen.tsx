import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { today } from '../core/utils/dates';
import { usePlanner } from '../data/PlannerProvider';
import { AppScreen, DatabaseGate } from '../ui/Primitives';
import { useAppColors } from '../ui/theme';
import { completedTimeSeries, recentSeriesMonths } from './progressData';
import type { CompletedSeries } from './progressData';
import { ProgressArchive } from './progress/ProgressArchive';
import { ProgressHabits } from './progress/ProgressHabits';
import { ProgressSummary } from './progress/ProgressSummary';
import { styles } from './progress/styles';

type ProgressTab = 'summary' | 'habits' | 'archive';

/** Coordina le tre viste dei progressi mantenendo selezione e navigazione del diario. */
export function ProgressScreen() {
  const { snapshot, statistics } = usePlanner();
  const colors = useAppColors();
  const [tab, setTab] = useState<ProgressTab>('summary');
  const [selectedMonth, setSelectedMonth] = useState(() => today().slice(0, 7));
  const [visibleCount, setVisibleCount] = useState(8);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);
  const reference = today();
  const completed = useMemo(() => statistics
    ? completedTimeSeries(statistics.getTimeSeriesResults(reference), reference) : [], [statistics, reference]);
  const months = useMemo(() => recentSeriesMonths(completed, reference), [completed, reference]);
  if (!snapshot || !statistics) return <DatabaseGate><></></DatabaseGate>;

  const activeHabits = (snapshot.archive.weeklyTimeHabits ?? []).filter(habit => !habit.archivedOn);
  const openSeries = (entry: CompletedSeries) => { setSelectedSeriesKey(entry.key); setTab('archive'); };
  const selectTab = (next: ProgressTab) => { setTab(next); if (next === 'archive') setSelectedSeriesKey(null); };

  return <AppScreen eyebrow="Il tuo percorso" title="Progressi" scrollable={false}>
    <View style={[styles.tabs, { backgroundColor: colors.soft }]} accessibilityRole="tablist">
      {([['summary', 'Riepilogo'], ['habits', 'Per abitudine'], ['archive', 'Archivio']] as const)
        .map(([key, label]) => <Pressable
          key={key}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === key }}
          onPress={() => selectTab(key)}
          style={[styles.tab, tab === key && { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.tabText, { color: tab === key ? colors.accent : colors.muted }]}>{label}</Text>
        </Pressable>)}
    </View>
    {tab === 'summary' && <ProgressSummary completed={completed} months={months} selectedMonth={selectedMonth}
      onSelectMonth={setSelectedMonth} onOpenSeries={openSeries} colors={colors} />}
    {tab === 'habits' && <ProgressHabits habits={activeHabits} completed={completed} onOpenSeries={openSeries} colors={colors} />}
    {tab === 'archive' && <ProgressArchive completed={completed} selectedSeriesKey={selectedSeriesKey}
      onSelectSeriesKey={setSelectedSeriesKey} visibleCount={visibleCount} onShowMore={() => setVisibleCount(count => count + 8)}
      statistics={statistics} reference={reference} colors={colors} />}
  </AppScreen>;
}
