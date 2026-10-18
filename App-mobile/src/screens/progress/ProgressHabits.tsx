import { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import type { WeeklyTimeHabit } from '../../core/model/weeklyTime';
import { formatDurationMinutes } from '../../core/utils/time';
import { HabitIconBadge } from '../../ui/HabitIconBadge';
import { Surface } from '../../ui/Primitives';
import type { AppColors } from '../../ui/theme';
import type { CompletedSeries } from '../progressData';
import { ProgressTrack, SectionTitle, seriesPeriod } from './shared';
import { styles } from './styles';

/** Ultima serie confermata di ciascuna abitudine a ore attiva. */
export function ProgressHabits({ habits, completed, onOpenSeries, colors }: {
  habits: WeeklyTimeHabit[];
  completed: CompletedSeries[];
  onOpenSeries: (entry: CompletedSeries) => void;
  colors: AppColors;
}) {
  const latestByHabit = useMemo(() => {
    const latest = new Map<string, CompletedSeries>();
    for (const entry of completed) if (!latest.has(entry.result.habit.id)) latest.set(entry.result.habit.id, entry);
    return latest;
  }, [completed]);

  return <FlatList
    style={styles.list}
    contentContainerStyle={styles.content}
    data={habits}
    keyExtractor={habit => habit.id}
    ListHeaderComponent={<View style={styles.content}>
      <SectionTitle title="Ultima serie per abitudine" trailing={`${habits.length} attive`} colors={colors} />
      <Text style={[styles.muted, { color: colors.muted }]}>Le barre confrontano il tempo svolto con l’obiettivo di ogni serie.</Text>
    </View>}
    ListEmptyComponent={<Surface colors={colors}>
      <Text style={[styles.muted, { color: colors.muted }]}>Non ci sono abitudini a tempo attive.</Text>
    </Surface>}
    renderItem={({ item: habit }) => {
      const entry = latestByHabit.get(habit.id);
      const description = entry
        ? `${seriesPeriod(entry)} · ${formatDurationMinutes(entry.result.completedMinutes)} / ${formatDurationMinutes(entry.result.series.targetMinutes)}`
        : 'Nessuna serie conclusa';
      return <Pressable
        accessibilityRole="button"
        disabled={!entry}
        accessibilityLabel={entry ? `Apri l'ultima serie di ${habit.title}` : `${habit.title}, nessuna serie conclusa`}
        onPress={() => { if (entry) onOpenSeries(entry); }}
        style={[styles.habitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.habitCardTop}>
          <View style={styles.habitIdentity}>
            <HabitIconBadge icon={habit.icon} color={habit.color} backgroundColor={colors.soft} />
            <Text style={[styles.habitTitle, { color: colors.text }]}>{habit.title}</Text>
          </View>
          <Text style={[styles.habitStatus, { color: entry?.result.reached ? colors.accent : colors.muted }]}>
            {entry ? entry.result.reached ? '✓' : `${Math.round(entry.result.completedMinutes / entry.result.series.targetMinutes * 100)}%` : '—'}
          </Text>
        </View>
        <Text style={[styles.muted, { color: colors.muted }]}>{description}</Text>
        {entry && <ProgressTrack completed={entry.result.completedMinutes} target={entry.result.series.targetMinutes} colors={colors} />}
      </Pressable>;
    }}
  />;
}
