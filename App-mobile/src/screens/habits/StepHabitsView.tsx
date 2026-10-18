import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { eventColorValue } from '../../core/constants';
import type { Habit } from '../../core/model/habit';
import type { PlannerArchive } from '../../core/model/outcomeArchive';
import { addDays, displayDate, today } from '../../core/utils/dates';
import type { StatisticsRepository } from '../../core/repository/StatisticsRepository';
import { HabitIconBadge } from '../../ui/HabitIconBadge';
import { Surface } from '../../ui/Primitives';
import type { AppColors } from '../../ui/theme';
import { selectedFirst } from './selectedFirst';
import { styles } from './styles';

interface StepHabitsViewProps {
  archive: PlannerArchive;
  statistics: StatisticsRepository;
  colors: AppColors;
  initialHabitId?: string;
}

/** Mostra soltanto le schede visibili; la cronologia è calcolata quando viene aperta. */
export function StepHabitsView({ archive, statistics, colors, initialHabitId }: StepHabitsViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(initialHabitId ?? null);
  const habits = selectedFirst(archive.habits ?? [], initialHabitId);
  const reference = today();
  return <FlatList
    style={styles.list}
    contentContainerStyle={styles.listContent}
    data={habits}
    keyExtractor={habit => habit.id}
    extraData={expandedId}
    keyboardShouldPersistTaps="handled"
    ListEmptyComponent={<Surface colors={colors}>
      <Text style={[styles.heading, { color: colors.text }]}>Il primo percorso parte da qui</Text>
      <Text style={[styles.muted, { color: colors.muted }]}>Scegli un’abitudine e un traguardo alla tua portata.</Text>
    </Surface>}
    renderItem={({ item }) => <StepHabitCard
      habit={item}
      archive={archive}
      statistics={statistics}
      reference={reference}
      expanded={expandedId === item.id}
      onToggle={() => setExpandedId(current => current === item.id ? null : item.id)}
      colors={colors}
    />}
  />;
}

function StepHabitCard({ habit, archive, statistics, reference, expanded, onToggle, colors }: {
  habit: Habit;
  archive: PlannerArchive;
  statistics: StatisticsRepository;
  reference: string;
  expanded: boolean;
  onToggle: () => void;
  colors: AppColors;
}) {
  const progress = statistics.getHabitProgress(habit.id);
  const completedOn = statistics.getHabitCompletionDate(habit.id);
  const accent = eventColorValue(habit.color);
  const recentStart = addDays(reference, -28);
  const futureEnd = addDays(reference, 14);
  let entries: ReturnType<StatisticsRepository['getHabitTimeline']> = [];
  if (expanded) {
    // Include tutti gli esiti registrati, ma limita le occorrenze senza esito alla finestra vicina a oggi.
    const sourceIds = new Set(archive.calendar.items.filter(item => item.habitId === habit.id).map(item => item.id));
    const recordedDates = archive.history.filter(record => sourceIds.has(record.sourceId)).map(record => record.eventDate);
    const from = recordedDates.reduce((earliest, date) => date < earliest ? date : earliest, recentStart);
    const through = recordedDates.reduce((latest, date) => date > latest ? date : latest, futureEnd);
    entries = statistics.getHabitTimeline(habit.id, from, through)
      .filter(entry => entry.outcome || (entry.date >= recentStart && entry.date <= futureEnd));
  }

  return <Surface colors={colors}>
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${expanded ? 'Nascondi' : 'Mostra'} la cronologia di ${habit.title}`}
      onPress={onToggle}
      style={styles.summary}
    >
      <View style={styles.row}>
        <HabitIconBadge icon={habit.icon} color={habit.color} backgroundColor={colors.soft} />
        <View style={styles.flex}>
          <Text style={[styles.heading, { color: colors.text }]}>{habit.title}</Text>
          <Text style={[styles.muted, { color: colors.muted }]}>
            {completedOn ? 'Serie conclusa' : `${progress.currentStep} di ${progress.target} step valutati`}
          </Text>
        </View>
        <Text style={[styles.historyToggle, { color: colors.accent }]}>{expanded ? 'Chiudi ⌃' : 'Cronologia ⌄'}</Text>
      </View>
      {habit.motivation ? <Text style={[styles.muted, { color: colors.muted }]}>{habit.motivation}</Text> : null}
      <View style={[styles.track, { backgroundColor: colors.soft }]}>
        <View style={[styles.fill, { width: `${progress.currentStep / progress.target * 100}%`, backgroundColor: accent }]} />
      </View>
      <Text style={[styles.muted, { color: colors.muted }]}>{progress.completed} eventi fatti su {progress.target}</Text>
    </Pressable>
    {expanded && <View style={[styles.history, { borderTopColor: colors.border }]}>
      <Text style={[styles.historyTitle, { color: colors.text }]}>Cronologia del percorso</Text>
      {entries.length === 0
        ? <Text style={[styles.muted, { color: colors.muted }]}>Non ci sono ancora eventi nel percorso.</Text>
        : entries.map(entry => {
          const completed = entry.outcome === 'completed';
          const skipped = entry.outcome === 'skipped';
          const status = completed ? 'Completata' : skipped ? 'Non fatta' : entry.date > reference ? 'Pianificata' : 'Da registrare';
          return <View key={`${entry.sourceId}@${entry.occurrenceDate}`} style={styles.historyRow}>
            <View style={[styles.historyNode, { backgroundColor: completed ? accent : colors.soft, borderColor: completed ? accent : colors.border }]}>
              <Text style={[styles.historySymbol, { color: completed ? '#ffffff' : skipped ? colors.danger : colors.muted }]}>
                {completed ? '✓' : skipped ? '×' : '·'}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text style={[styles.historyDate, { color: colors.muted }]}>
                {displayDate(entry.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                {entry.start ? ` · ${entry.start}` : ''}
              </Text>
              <Text style={[styles.historyStatus, { color: completed ? accent : skipped ? colors.danger : colors.text }]}>{status}</Text>
              {entry.moved && <Text style={[styles.historyNote, { color: colors.muted }]}>Spostata rispetto al piano originale</Text>}
              {entry.removed && <Text style={[styles.historyNote, { color: colors.muted }]}>Rimossa dal calendario · esito conservato</Text>}
            </View>
          </View>;
        })}
    </View>}
  </Surface>;
}
