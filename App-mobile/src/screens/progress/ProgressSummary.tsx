import { Pressable, ScrollView, Text, View } from 'react-native';
import { formatDurationMinutes } from '../../core/utils/time';
import { HabitIconBadge } from '../../ui/HabitIconBadge';
import { Surface } from '../../ui/Primitives';
import type { AppColors } from '../../ui/theme';
import type { CompletedSeries, MonthSeriesSummary } from '../progressData';
import { monthLabel, ProgressTrack, SectionTitle, seriesPeriod } from './shared';
import { styles } from './styles';

interface ProgressSummaryProps {
  completed: CompletedSeries[];
  months: MonthSeriesSummary[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  onOpenSeries: (entry: CompletedSeries) => void;
  colors: AppColors;
}

/** Riepilogo delle serie concluse e andamento degli ultimi sei mesi. */
export function ProgressSummary({ completed, months, selectedMonth, onSelectMonth, onOpenSeries, colors }: ProgressSummaryProps) {
  const latest = completed[0];
  const activeMonth = months.find(month => month.key === selectedMonth) ?? months.at(-1)!;
  const chartMax = Math.max(1, ...months.map(month => month.concluded));

  return <ScrollView style={styles.list} contentContainerStyle={styles.content}>
    {latest ? <View style={[styles.hero, { backgroundColor: colors.soft, borderColor: colors.border }]}>
      <View style={styles.heroTop}>
        <Text style={[styles.overline, { color: colors.muted }]}>ULTIMA SERIE CONCLUSA</Text>
        <Text style={[styles.status, { color: latest.result.reached ? colors.accent : colors.muted, backgroundColor: colors.surface }]}>
          {latest.result.reached ? '✓ Raggiunta' : 'Sotto obiettivo'}
        </Text>
      </View>
      <View style={styles.detailHeading}>
        <HabitIconBadge icon={latest.result.habit.icon} color={latest.result.habit.color} backgroundColor={colors.surface} />
        <Text style={[styles.heroTitle, { color: colors.text }]}>{latest.result.habit.title}</Text>
      </View>
      <Text style={[styles.muted, { color: colors.muted }]}>
        {seriesPeriod(latest)} · {latest.result.series.period === 'month' ? 'Serie mensile' : 'Serie settimanale'}
      </Text>
      <View style={styles.heroValue}>
        <Text style={[styles.bigValue, { color: colors.text }]}>{formatDurationMinutes(latest.result.completedMinutes)}</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>su {formatDurationMinutes(latest.result.series.targetMinutes)}</Text>
      </View>
      <ProgressTrack completed={latest.result.completedMinutes} target={latest.result.series.targetMinutes} colors={colors} />
      <Pressable accessibilityRole="button" accessibilityLabel={`Apri il diario di ${latest.result.habit.title}`} onPress={() => onOpenSeries(latest)}>
        <Text style={[styles.link, { color: colors.accent }]}>Apri diario →</Text>
      </Pressable>
    </View> : <Surface colors={colors}>
      <Text style={[styles.sectionHeading, { color: colors.text }]}>La tua prima serie comparirà qui</Text>
      <Text style={[styles.muted, { color: colors.muted }]}>Concludi una serie a tempo per iniziare a vedere i tuoi progressi.</Text>
    </Surface>}

    <SectionTitle title="Le tue serie" trailing={monthLabel(activeMonth.key)} colors={colors} />
    <View style={styles.metrics}>
      {[[String(activeMonth.concluded), 'concluse'], [String(activeMonth.reached), 'raggiunte'],
        [formatDurationMinutes(activeMonth.minutes), 'tempo svolto']].map(([value, label]) => <View
          key={label} style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
          <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
        </View>)}
    </View>

    <Surface colors={colors}>
      <Text style={[styles.sectionHeading, { color: colors.text }]}>Serie negli ultimi 6 mesi</Text>
      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
        <Text style={[styles.legendText, { color: colors.muted }]}>Obiettivo raggiunto</Text>
        <View style={[styles.legendDot, { backgroundColor: colors.muted }]} />
        <Text style={[styles.legendText, { color: colors.muted }]}>Sotto obiettivo</Text>
      </View>
      <View style={styles.chart}>{months.map(month => {
        const below = month.concluded - month.reached;
        const selected = month.key === activeMonth.key;
        return <Pressable key={month.key} accessibilityRole="button" accessibilityState={{ selected }}
          accessibilityLabel={`${monthLabel(month.key)}, ${month.concluded} serie concluse, ${month.reached} raggiunte`}
          onPress={() => onSelectMonth(month.key)} style={styles.chartColumn}>
          <View style={[styles.chartBar, { backgroundColor: colors.soft }]}>
            {below > 0 && <View style={{ height: below / chartMax * 108, backgroundColor: colors.muted }} />}
            {month.reached > 0 && <View style={{ height: month.reached / chartMax * 108, backgroundColor: colors.accent }} />}
          </View>
          <Text style={[styles.chartLabel, { color: selected ? colors.text : colors.muted, fontWeight: selected ? '800' : '500' }]}>
            {monthLabel(month.key, true)}
          </Text>
        </Pressable>;
      })}</View>
      <Text style={[styles.chartCaption, { color: colors.text, backgroundColor: colors.soft }]}>
        {monthLabel(activeMonth.key)} · {activeMonth.concluded} serie concluse · {activeMonth.reached} raggiunte
      </Text>
    </Surface>
  </ScrollView>;
}
