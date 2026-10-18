import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { eventColorValue } from '../../core/constants';
import type { TimeSeriesResult, TimeSession, WeeklyTimeHabit } from '../../core/model/weeklyTime';
import type { StatisticsRepository } from '../../core/repository/StatisticsRepository';
import { displayDate, today } from '../../core/utils/dates';
import { formatDurationMinutes } from '../../core/utils/time';
import { usePlanner } from '../../data/PlannerProvider';
import { HabitIconBadge } from '../../ui/HabitIconBadge';
import { ActionButton, Surface } from '../../ui/Primitives';
import type { AppColors } from '../../ui/theme';
import { selectedFirst } from './selectedFirst';
import { styles } from './styles';

interface TimeHabitsViewProps {
  habits: WeeklyTimeHabit[];
  statistics: StatisticsRepository;
  colors: AppColors;
  initialHabitId?: string;
}

/** Elenca gli obiettivi a ore senza calcolare le cronologie fuori dalla finestra visibile. */
export function TimeHabitsView({ habits, statistics, colors, initialHabitId }: TimeHabitsViewProps) {
  const { reviewTimeSeries } = usePlanner();
  const [expandedId, setExpandedId] = useState<string | null>(initialHabitId ?? null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const reference = today();
  const timeResults = useMemo(() => statistics.getTimeSeriesResults(reference), [statistics, reference]);
  const activeHabits = useMemo(() => selectedFirst(habits.filter(habit => !habit.archivedOn), initialHabitId), [habits, initialHabitId]);
  const toggleExpanded = useCallback((id: string) => setExpandedId(current => current === id ? null : id), []);
  const toggleEntry = useCallback((id: string) => setEntryId(current => current === id ? null : id), []);
  const onSaved = useCallback((id: string) => { setExpandedId(id); setEntryId(null); }, []);

  return <FlatList
    style={styles.list}
    contentContainerStyle={styles.listContent}
    data={activeHabits}
    keyExtractor={habit => habit.id}
    extraData={`${expandedId}:${entryId}`}
    keyboardShouldPersistTaps="handled"
    ListEmptyComponent={<Surface colors={colors}>
      <Text style={[styles.heading, { color: colors.text }]}>Nessuna abitudine a ore in corso</Text>
      <Text style={[styles.muted, { color: colors.muted }]}>Imposta un nuovo obiettivo di tempo. Le serie concluse restano in Progressi → Archivio.</Text>
    </Surface>}
    renderItem={({ item }) => <TimeHabitCard
      habit={item}
      statistics={statistics}
      timeResults={timeResults}
      reference={reference}
      expanded={expandedId === item.id}
      entryOpen={entryId === item.id}
      onToggleExpanded={toggleExpanded}
      onToggleEntry={toggleEntry}
      onSaved={onSaved}
      onReview={reviewTimeSeries}
      colors={colors}
    />}
  />;
}

const TimeHabitCard = memo(function TimeHabitCard({ habit, statistics, timeResults, reference, expanded, entryOpen,
  onToggleExpanded, onToggleEntry, onSaved, onReview, colors }: {
  habit: WeeklyTimeHabit;
  statistics: StatisticsRepository;
  timeResults: TimeSeriesResult[];
  reference: string;
  expanded: boolean;
  entryOpen: boolean;
  onToggleExpanded: (id: string) => void;
  onToggleEntry: (id: string) => void;
  onSaved: (id: string) => void;
  onReview: (habitId: string, seriesId: string) => void;
  colors: AppColors;
}) {
  const progress = statistics.getWeeklyTimeProgress(habit.id, reference);
  const series = habit.series?.at(-1);
  const result = timeResults.find(entry => entry.habit.id === habit.id && entry.series.id === series?.id);
  const canConclude = Boolean(series && !series.decision && (result?.reached || series.endsOn < reference));
  const seriesLabel = canConclude
    ? result?.reached ? 'Obiettivo raggiunto · serie da concludere' : 'Serie scaduta · da concludere'
    : progress.period === 'month' ? 'Obiettivo mensile' : 'Obiettivo settimanale';
  const sessions = habit.startsOn <= reference ? statistics.getTimeSessions(habit.id, habit.startsOn, reference) : [];
  const totalMinutes = sessions.filter(session => !session.removed).reduce((total, session) => total + session.minutes, 0);
  const accent = eventColorValue(habit.color);

  return <Surface colors={colors}>
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${expanded ? 'Nascondi' : 'Mostra'} la cronologia di ${habit.title}`}
      onPress={() => onToggleExpanded(habit.id)}
      style={styles.summary}
    >
      <View style={styles.row}>
        <HabitIconBadge icon={habit.icon} color={habit.color} backgroundColor={colors.soft} />
        <View style={styles.flex}>
          <Text style={[styles.heading, { color: colors.text }]}>{habit.title}</Text>
          <Text style={[styles.muted, { color: colors.muted }]}>{seriesLabel}</Text>
        </View>
        <Text style={[styles.historyToggle, { color: colors.accent }]}>
          {expanded ? 'Chiudi ⌃' : `Cronologia (${sessions.length}) ⌄`}
        </Text>
      </View>
      <Text style={[styles.totalTime, { color: colors.text }]}>Totale svolto: {formatDurationMinutes(totalMinutes)}</Text>
      <Text style={[styles.muted, { color: colors.text }]}>
        {formatDurationMinutes(progress.completedMinutes)} su {formatDurationMinutes(progress.targetMinutes)} registrati
      </Text>
      <View style={[styles.track, { backgroundColor: colors.soft }]}>
        <View style={[styles.fill, { width: `${Math.min(progress.percent, 100)}%`, backgroundColor: accent }]} />
      </View>
    </Pressable>
    {canConclude && series
      ? <ActionButton label="Concludi la serie" onPress={() => onReview(habit.id, series.id)} />
      : <ActionButton label="Aggiungi tempo" secondary disabled={Boolean(series && series.startsOn > reference)} onPress={() => onToggleEntry(habit.id)} />}
    {entryOpen && !canConclude && <TimeEntryForm habitId={habit.id} onSaved={onSaved} colors={colors} />}
    {expanded && <TimeHistory sessions={sessions} accent={accent} colors={colors} />}
  </Surface>;
});

function TimeEntryForm({ habitId, onSaved, colors }: { habitId: string; onSaved: (id: string) => void; colors: AppColors }) {
  const { recordTime, saving } = usePlanner();
  const [minutesText, setMinutesText] = useState('25');
  const [notesText, setNotesText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const save = () => {
    const minutes = Number(minutesText);
    if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 1440) {
      setError('Inserisci un numero di minuti da 1 a 1440.');
      return;
    }
    void recordTime(habitId, minutes, notesText)
      .then(() => onSaved(habitId))
      .catch(cause => setError(cause instanceof Error ? cause.message : 'Tempo non salvato.'));
  };
  return <View style={styles.entry}>
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>Tempo effettivamente svolto · minuti</Text>
      <TextInput accessibilityLabel="Minuti da aggiungere" keyboardType="number-pad" value={minutesText} onChangeText={setMinutesText}
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]} />
    </View>
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>Cosa hai fatto?</Text>
      <TextInput accessibilityLabel="Cosa hai fatto?" multiline numberOfLines={3} textAlignVertical="top" autoCapitalize="sentences"
        placeholder="Una nota facoltativa sui tuoi progressi" placeholderTextColor={colors.muted} value={notesText} onChangeText={setNotesText}
        style={[styles.input, styles.notesInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]} />
    </View>
    {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
    <ActionButton label="Salva tempo" disabled={saving} onPress={save} />
  </View>;
}

function TimeHistory({ sessions, accent, colors }: { sessions: TimeSession[]; accent: string; colors: AppColors }) {
  return <View style={[styles.history, { borderTopColor: colors.border }]}>
    <Text style={[styles.historyTitle, { color: colors.text }]}>Cronologia del tempo</Text>
    {sessions.length === 0
      ? <Text style={[styles.muted, { color: colors.muted }]}>Nessun tempo registrato per questa abitudine.</Text>
      : [...sessions].reverse().map(session => <View key={session.id} style={styles.historyRow}>
        <View style={[styles.historyNode, { backgroundColor: session.removed ? colors.soft : accent, borderColor: session.removed ? colors.border : accent }]}>
          <Text style={[styles.historySymbol, { color: session.removed ? colors.muted : '#ffffff' }]}>{session.removed ? '×' : '+'}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={[styles.historyDate, { color: colors.muted }]}>
            {displayDate(session.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
          <Text style={[styles.historyStatus, { color: session.removed ? colors.muted : accent }]}>
            {formatDurationMinutes(session.minutes)}{session.removed ? ' · Rimossa' : ''}
          </Text>
          {session.notes.trim() ? <Text style={[styles.sessionNote, { color: colors.text }]}>{session.notes}</Text> : null}
        </View>
      </View>)}
  </View>;
}
