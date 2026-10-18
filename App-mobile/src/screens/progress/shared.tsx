import { Text, View } from 'react-native';
import { displayDate } from '../../core/utils/dates';
import type { AppColors } from '../../ui/theme';
import type { CompletedSeries } from '../progressData';
import { styles } from './styles';

/** Etichetta civile del mese usata dal grafico e dall'archivio. */
export function monthLabel(key: string, short = false): string {
  const date = new Date(`${key}-01T00:00:00Z`);
  const label = new Intl.DateTimeFormat('it-IT', { month: short ? 'short' : 'long',
    ...(short ? {} : { year: 'numeric' }), timeZone: 'UTC' }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Intervallo leggibile della serie confermata. */
export function seriesPeriod(entry: CompletedSeries): string {
  return `${displayDate(entry.result.series.startsOn, { month: 'short' })} – ${displayDate(entry.closedOn, { month: 'short', year: 'numeric' })}`;
}

export function ProgressTrack({ completed, target, colors }: { completed: number; target: number; colors: AppColors }) {
  const percent = target > 0 ? Math.min(100, completed / target * 100) : 0;
  return <View style={[styles.track, { backgroundColor: colors.border }]} accessibilityLabel={`${Math.round(percent)}% dell'obiettivo`}>
    <View style={[styles.trackFill, { width: `${percent}%`, backgroundColor: colors.accent }]} />
  </View>;
}

export function SectionTitle({ title, trailing, colors }: { title: string; trailing?: string; colors: AppColors }) {
  return <View style={styles.sectionTitle}>
    <Text style={[styles.sectionHeading, { color: colors.text }]}>{title}</Text>
    {trailing ? <Text style={[styles.sectionTrailing, { color: colors.muted }]}>{trailing}</Text> : null}
  </View>;
}
