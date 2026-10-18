import { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { eventColorValue } from '../../core/constants';
import type { TimeSession } from '../../core/model/weeklyTime';
import type { StatisticsRepository } from '../../core/repository/StatisticsRepository';
import { displayDate } from '../../core/utils/dates';
import { formatDurationMinutes } from '../../core/utils/time';
import { EventIcon } from '../../ui/EventIcon';
import { Surface } from '../../ui/Primitives';
import type { AppColors } from '../../ui/theme';
import type { CompletedSeries } from '../progressData';
import { monthLabel, ProgressTrack, SectionTitle, seriesPeriod } from './shared';
import { styles } from './styles';

type ArchiveRow = { kind: 'month'; key: string; month: string } | { kind: 'series'; key: string; entry: CompletedSeries };

/** Archivio e diario: monta soltanto le righe visibili della lista corrente. */
export function ProgressArchive({ completed, selectedSeriesKey, onSelectSeriesKey, visibleCount, onShowMore,
  statistics, reference, colors }: {
  completed: CompletedSeries[];
  selectedSeriesKey: string | null;
  onSelectSeriesKey: (key: string | null) => void;
  visibleCount: number;
  onShowMore: () => void;
  statistics: StatisticsRepository;
  reference: string;
  colors: AppColors;
}) {
  const selectedSeries = completed.find(entry => entry.key === selectedSeriesKey);
  const rows = useMemo(() => {
    // I titoli mensili diventano righe della FlatList per conservare la virtualizzazione dell'archivio.
    const result: ArchiveRow[] = [];
    let previousMonth = '';
    for (const entry of completed.slice(0, visibleCount)) {
      const month = entry.closedOn.slice(0, 7);
      if (month !== previousMonth) result.push({ kind: 'month', key: `month:${month}`, month });
      result.push({ kind: 'series', key: entry.key, entry });
      previousMonth = month;
    }
    return result;
  }, [completed, visibleCount]);

  if (selectedSeries) {
    const sessions = statistics.getTimeSessions(selectedSeries.result.habit.id,
      selectedSeries.result.series.startsOn, selectedSeries.result.series.endsOn,
      selectedSeries.result.series.id).filter(session => session.date <= reference).reverse();
    return <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={sessions}
      keyExtractor={session => session.id}
      ListHeaderComponent={<SeriesHeader entry={selectedSeries} onBack={() => onSelectSeriesKey(null)} colors={colors} />}
      ListEmptyComponent={<Surface colors={colors}>
        <Text style={[styles.muted, { color: colors.muted }]}>Nessuna registrazione per questa serie.</Text>
      </Surface>}
      renderItem={({ item }) => <SessionRow session={item} colors={colors} />}
    />;
  }

  return <FlatList
    style={styles.list}
    contentContainerStyle={styles.content}
    data={rows}
    keyExtractor={row => row.key}
    ListHeaderComponent={<View style={styles.content}>
      <SectionTitle title="Serie concluse" trailing={`${completed.length} serie`} colors={colors} />
      <Text style={[styles.muted, { color: colors.muted }]}>Tutti i periodi confermati, anche delle abitudini non più attive.</Text>
    </View>}
    ListEmptyComponent={<Surface colors={colors}>
      <Text style={[styles.muted, { color: colors.muted }]}>Le serie concluse compariranno qui.</Text>
    </Surface>}
    ListFooterComponent={completed.length > visibleCount ? <Pressable accessibilityRole="button" onPress={onShowMore}>
      <Text style={[styles.more, { color: colors.accent }]}>Mostra altre serie</Text>
    </Pressable> : undefined}
    renderItem={({ item }) => item.kind === 'month'
      ? <SectionTitle title={monthLabel(item.month)} colors={colors} />
      : <SeriesRow entry={item.entry} onPress={() => onSelectSeriesKey(item.key)} colors={colors} />}
  />;
}

function SeriesHeader({ entry, onBack, colors }: { entry: CompletedSeries; onBack: () => void; colors: AppColors }) {
  const accent = eventColorValue(entry.result.habit.color);
  return <View style={styles.content}>
    <Pressable accessibilityRole="button" onPress={onBack}>
      <Text style={[styles.link, { color: colors.accent }]}>← Tutte le serie</Text>
    </Pressable>
    <View style={[styles.hero, { backgroundColor: colors.soft, borderColor: accent, borderWidth: 2 }]}>
      <Text style={[styles.overline, { color: colors.muted }]}>SERIE CONCLUSA</Text>
      <View style={styles.detailHeading}>
        <View style={[styles.archiveIcon, { backgroundColor: colors.surface }]}>
          <EventIcon icon={entry.result.habit.icon} color={accent} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>{entry.result.habit.title}</Text>
      </View>
      <Text style={[styles.muted, { color: colors.muted }]}>
        {seriesPeriod(entry)} · {entry.result.series.period === 'month' ? 'Serie mensile' : 'Serie settimanale'}
      </Text>
      <View style={styles.heroValue}>
        <Text style={[styles.bigValue, { color: colors.text }]}>{formatDurationMinutes(entry.result.completedMinutes)}</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>su {formatDurationMinutes(entry.result.series.targetMinutes)}</Text>
      </View>
      <ProgressTrack completed={entry.result.completedMinutes} target={entry.result.series.targetMinutes} colors={colors} />
      <Text style={[styles.muted, { color: entry.result.reached ? colors.accent : colors.muted }]}>
        {entry.result.reached ? 'Obiettivo raggiunto' : 'Sotto obiettivo'}
      </Text>
    </View>
    <SectionTitle title="Diario della serie" colors={colors} />
  </View>;
}

function SeriesRow({ entry, onPress, colors }: { entry: CompletedSeries; onPress: () => void; colors: AppColors }) {
  const accent = eventColorValue(entry.result.habit.color);
  const periodName = entry.result.series.period === 'month' ? 'mensile' : 'settimanale';
  const outcomeName = entry.result.reached ? 'obiettivo raggiunto' : 'sotto obiettivo';
  const label = `Apri ${entry.result.habit.title}, serie ${periodName}, ${seriesPeriod(entry)}, ${outcomeName}`;
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    style={[styles.archiveRow, { backgroundColor: colors.surface, borderColor: accent }]}
  >
    <View style={[styles.archiveIcon, { backgroundColor: colors.soft }]}>
      <EventIcon icon={entry.result.habit.icon} color={accent} />
    </View>
    <View style={styles.archiveRowText}>
      <Text style={[styles.habitTitle, { color: colors.text }]}>{entry.result.habit.title}</Text>
      <Text style={[styles.muted, { color: colors.muted }]}>
        {seriesPeriod(entry)} · {entry.result.series.period === 'month' ? 'Mensile' : 'Settimanale'}
      </Text>
      <Text style={[styles.muted, { color: colors.muted }]}>
        {formatDurationMinutes(entry.result.completedMinutes)} / {formatDurationMinutes(entry.result.series.targetMinutes)}
      </Text>
    </View>
    <Text style={[styles.archiveArrow, { color: colors.muted }]}>›</Text>
  </Pressable>;
}

function SessionRow({ session, colors }: { session: TimeSession; colors: AppColors }) {
  return <View style={[styles.sessionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.sessionTop}>
      <Text style={[styles.sessionDate, { color: colors.muted }]}>
        {displayDate(session.date, { weekday: 'short', month: 'short', year: 'numeric' })}
      </Text>
      <Text style={[styles.sessionDuration, { color: session.removed ? colors.muted : colors.accent }]}>
        {formatDurationMinutes(session.minutes)}{session.removed ? ' · Rimossa' : ''}
      </Text>
    </View>
    {session.notes.trim()
      ? <Text style={[styles.sessionNote, { color: session.removed ? colors.muted : colors.text }]}>{session.notes}</Text>
      : <Text style={[styles.muted, { color: colors.muted }]}>Nessuna nota</Text>}
  </View>;
}
