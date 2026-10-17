import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { eventColors } from '../core/constants';
import { addDays, displayDate, today } from '../core/utils/dates';
import { formatDurationMinutes } from '../core/utils/time';
import { usePlanner } from '../data/PlannerProvider';
import { ActionButton, AppScreen, DatabaseGate, Surface } from '../ui/Primitives';
import { useAppColors } from '../ui/theme';

function selectedFirst<T extends { id: string }>(items: T[], selectedId?: string): T[] {
  if (!selectedId) return items;
  const selected = items.find(item => item.id === selectedId);
  return selected ? [selected, ...items.filter(item => item.id !== selectedId)] : items;
}

/** Elenco mobile delle abitudini a step e degli obiettivi a ore. */
export function HabitsScreen({ initialMode, initialHabitId }: { initialMode?: 'steps' | 'hours'; initialHabitId?: string }) {
  const { snapshot, statistics, saving, recordTime } = usePlanner();
  const colors = useAppColors();
  const [mode, setMode] = useState<'steps' | 'hours'>(initialMode ?? 'steps');
  const [expandedStepId, setExpandedStepId] = useState<string | null>(initialMode === 'steps' ? initialHabitId ?? null : null);
  const [expandedTimeId, setExpandedTimeId] = useState<string | null>(initialMode === 'hours' ? initialHabitId ?? null : null);
  const [timeHabitId, setTimeHabitId] = useState<string | null>(null);
  const [minutesText, setMinutesText] = useState('25');
  const [notesText, setNotesText] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!snapshot || !statistics) return <DatabaseGate><></></DatabaseGate>;
  const archive = snapshot.archive;
  const stepHabits = selectedFirst(archive.habits ?? [], initialMode === 'steps' ? initialHabitId : undefined);
  const timeHabits = selectedFirst(archive.weeklyTimeHabits ?? [], initialMode === 'hours' ? initialHabitId : undefined);
  const reference = today();
  const recentStart = addDays(reference, -28);
  const futureEnd = addDays(reference, 14);
  const saveMinutes = () => {
    const minutes = Number(minutesText);
    if (!timeHabitId || !Number.isSafeInteger(minutes) || minutes < 1 || minutes > 1440) {
      setError('Inserisci un numero di minuti da 1 a 1440.');
      return;
    }
    void recordTime(timeHabitId, minutes, notesText).then(() => { setExpandedTimeId(timeHabitId); setError(null); setTimeHabitId(null); setNotesText(''); }).catch(cause => {
      setError(cause instanceof Error ? cause.message : 'Tempo non salvato.');
    });
  };
  return <AppScreen eyebrow="Un passo alla volta" title="Abitudini">
    <View style={[styles.segment, { backgroundColor: colors.soft }]}>
      {(['steps', 'hours'] as const).map(id => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: mode === id }} onPress={() => { setMode(id); setError(null); }} style={[styles.segmentButton, { backgroundColor: mode === id ? colors.surface : colors.soft }]}><Text style={{ color: mode === id ? colors.text : colors.muted, fontWeight: '700' }}>{id === 'steps' ? 'A step' : 'A ore'}</Text></Pressable>)}
    </View>
    {mode === 'steps' ? <>
      {stepHabits.length === 0 ? <Surface colors={colors}><Text style={[styles.heading, { color: colors.text }]}>Il primo percorso parte da qui</Text><Text style={[styles.muted, { color: colors.muted }]}>Scegli un’abitudine e un traguardo alla tua portata.</Text></Surface> : stepHabits.map(habit => {
        const progress = statistics.getHabitProgress(habit.id);
        const completedOn = statistics.getHabitCompletionDate(habit.id);
        const expanded = expandedStepId === habit.id;
        const sourceIds = new Set(archive.calendar.items.filter(item => item.habitId === habit.id).map(item => item.id));
        const recordedDates = expanded ? archive.history.filter(record => sourceIds.has(record.sourceId)).map(record => record.eventDate) : [];
        const from = recordedDates.reduce((earliest, date) => date < earliest ? date : earliest, recentStart);
        const through = recordedDates.reduce((latest, date) => date > latest ? date : latest, futureEnd);
        const entries = expanded ? statistics.getHabitTimeline(habit.id, from, through)
          .filter(entry => entry.outcome || (entry.date >= recentStart && entry.date <= futureEnd)) : [];
        return <Surface key={habit.id} colors={colors}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${expanded ? 'Nascondi' : 'Mostra'} la cronologia di ${habit.title}`} onPress={() => setExpandedStepId(expanded ? null : habit.id)} style={styles.summary}>
            <View style={styles.row}><View style={[styles.colorBar, { backgroundColor: eventColors[habit.color].value }]} /><View style={styles.flex}><Text style={[styles.heading, { color: colors.text }]}>{habit.title}</Text><Text style={[styles.muted, { color: colors.muted }]}>{completedOn ? 'Serie conclusa' : `${progress.currentStep} di ${progress.target} step valutati`}</Text></View><Text style={[styles.historyToggle, { color: colors.accent }]}>{expanded ? 'Chiudi ⌃' : 'Cronologia ⌄'}</Text></View>
            {habit.motivation ? <Text style={[styles.muted, { color: colors.muted }]}>{habit.motivation}</Text> : null}
            <View style={[styles.track, { backgroundColor: colors.soft }]}><View style={[styles.fill, { width: `${progress.currentStep / progress.target * 100}%`, backgroundColor: eventColors[habit.color].value }]} /></View>
            <Text style={[styles.muted, { color: colors.muted }]}>{progress.completed} eventi fatti su {progress.target}</Text>
          </Pressable>
          {expanded && <View style={[styles.history, { borderTopColor: colors.border }]}>
            <Text style={[styles.historyTitle, { color: colors.text }]}>Cronologia del percorso</Text>
            {entries.length === 0 ? <Text style={[styles.muted, { color: colors.muted }]}>Non ci sono ancora eventi nel percorso.</Text> : entries.map(entry => {
              const completed = entry.outcome === 'completed';
              const skipped = entry.outcome === 'skipped';
              const status = completed ? 'Completata' : skipped ? 'Non fatta' : entry.date > reference ? 'Pianificata' : 'Da registrare';
              return <View key={`${entry.sourceId}@${entry.occurrenceDate}`} style={styles.historyRow}>
                <View style={[styles.historyNode, { backgroundColor: completed ? eventColors[habit.color].value : colors.soft, borderColor: completed ? eventColors[habit.color].value : colors.border }]}><Text style={[styles.historySymbol, { color: completed ? '#ffffff' : skipped ? colors.danger : colors.muted }]}>{completed ? '✓' : skipped ? '×' : '·'}</Text></View>
                <View style={styles.flex}><Text style={[styles.historyDate, { color: colors.muted }]}>{displayDate(entry.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}{entry.start ? ` · ${entry.start}` : ''}</Text><Text style={[styles.historyStatus, { color: completed ? eventColors[habit.color].value : skipped ? colors.danger : colors.text }]}>{status}</Text>{entry.moved && <Text style={[styles.historyNote, { color: colors.muted }]}>Spostata rispetto al piano originale</Text>}{entry.removed && <Text style={[styles.historyNote, { color: colors.muted }]}>Rimossa dal calendario · esito conservato</Text>}</View>
              </View>;
            })}
          </View>}
        </Surface>;
      })}
    </> : <>
      {timeHabits.length === 0 ? <Surface colors={colors}><Text style={[styles.heading, { color: colors.text }]}>Fai spazio a ciò che vuoi imparare</Text><Text style={[styles.muted, { color: colors.muted }]}>Imposta un obiettivo settimanale o mensile di tempo.</Text></Surface> : timeHabits.map(habit => {
        const progress = statistics.getWeeklyTimeProgress(habit.id, reference);
        const expanded = expandedTimeId === habit.id;
        const allSessions = habit.startsOn <= reference ? statistics.getTimeSessions(habit.id, habit.startsOn, reference) : [];
        const totalMinutes = allSessions.filter(session => !session.removed).reduce((total, session) => total + session.minutes, 0);
        const sessions = expanded ? [...allSessions].reverse() : [];
        return <Surface key={habit.id} colors={colors}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${expanded ? 'Nascondi' : 'Mostra'} la cronologia di ${habit.title}`} onPress={() => setExpandedTimeId(expanded ? null : habit.id)} style={styles.summary}>
            <View style={styles.row}><View style={[styles.colorBar, { backgroundColor: eventColors[habit.color].value }]} /><View style={styles.flex}><Text style={[styles.heading, { color: colors.text }]}>{habit.title}</Text><Text style={[styles.muted, { color: colors.muted }]}>{habit.archivedOn ? 'Archiviata' : progress.period === 'month' ? 'Obiettivo mensile' : 'Obiettivo settimanale'}</Text></View><Text style={[styles.historyToggle, { color: colors.accent }]}>{expanded ? 'Chiudi ⌃' : `Cronologia (${allSessions.length}) ⌄`}</Text></View>
            <Text style={[styles.totalTime, { color: colors.text }]}>Totale svolto: {formatDurationMinutes(totalMinutes)}</Text>
            <Text style={[styles.muted, { color: colors.text }]}>{formatDurationMinutes(progress.completedMinutes)} su {formatDurationMinutes(progress.targetMinutes)} registrati</Text>
            <View style={[styles.track, { backgroundColor: colors.soft }]}><View style={[styles.fill, { width: `${Math.min(progress.percent, 100)}%`, backgroundColor: eventColors[habit.color].value }]} /></View>
          </Pressable>
          {!habit.archivedOn && <ActionButton label="Aggiungi tempo" secondary onPress={() => { setTimeHabitId(timeHabitId === habit.id ? null : habit.id); setNotesText(''); setError(null); }} />}
          {timeHabitId === habit.id && <View style={styles.entry}>
            <View style={styles.field}><Text style={[styles.fieldLabel, { color: colors.text }]}>Tempo effettivamente svolto · minuti</Text><TextInput accessibilityLabel="Minuti da aggiungere" keyboardType="number-pad" value={minutesText} onChangeText={setMinutesText} style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]} /></View>
            <View style={styles.field}><Text style={[styles.fieldLabel, { color: colors.text }]}>Cosa hai fatto?</Text><TextInput accessibilityLabel="Cosa hai fatto?" multiline numberOfLines={3} textAlignVertical="top" autoCapitalize="sentences" placeholder="Una nota facoltativa sui tuoi progressi" placeholderTextColor={colors.muted} value={notesText} onChangeText={setNotesText} style={[styles.input, styles.notesInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]} /></View>
            <ActionButton label="Salva tempo" disabled={saving} onPress={saveMinutes} />
          </View>}
          {expanded && <View style={[styles.history, { borderTopColor: colors.border }]}>
            <Text style={[styles.historyTitle, { color: colors.text }]}>Cronologia del tempo</Text>
            {sessions.length === 0 ? <Text style={[styles.muted, { color: colors.muted }]}>Nessun tempo registrato per questa abitudine.</Text> : sessions.map(session => <View key={session.id} style={styles.historyRow}>
              <View style={[styles.historyNode, { backgroundColor: session.removed ? colors.soft : eventColors[habit.color].value, borderColor: session.removed ? colors.border : eventColors[habit.color].value }]}><Text style={[styles.historySymbol, { color: session.removed ? colors.muted : '#ffffff' }]}>{session.removed ? '×' : '+'}</Text></View>
              <View style={styles.flex}><Text style={[styles.historyDate, { color: colors.muted }]}>{displayDate(session.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Text><Text style={[styles.historyStatus, { color: session.removed ? colors.muted : eventColors[habit.color].value }]}>{formatDurationMinutes(session.minutes)}{session.removed ? ' · Rimossa' : ''}</Text>{session.notes.trim() ? <Text style={[styles.sessionNote, { color: colors.text }]}>{session.notes}</Text> : null}</View>
            </View>)}
          </View>}
        </Surface>;
      })}
    </>}
    {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
  </AppScreen>;
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  segmentButton: { flex: 1, minHeight: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  summary: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  colorBar: { width: 8, height: 37, borderRadius: 6 },
  heading: { fontSize: 17, fontWeight: '700' },
  totalTime: { fontSize: 14, fontWeight: '700' },
  historyToggle: { fontSize: 12, fontWeight: '700' },
  muted: { fontSize: 13, lineHeight: 19 },
  track: { height: 9, borderRadius: 8, overflow: 'hidden' },
  fill: { height: 9, borderRadius: 8 },
  history: { borderTopWidth: 1, paddingTop: 14, marginTop: 4, gap: 12 },
  historyTitle: { fontSize: 16, fontWeight: '700' },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  historyNode: { width: 29, height: 29, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  historySymbol: { fontSize: 19, fontWeight: '700', lineHeight: 23 },
  historyDate: { fontSize: 12, lineHeight: 17, textTransform: 'capitalize' },
  historyStatus: { fontSize: 14, fontWeight: '700' },
  historyNote: { fontSize: 12, lineHeight: 17 },
  sessionNote: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  entry: { gap: 10 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '700' },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 16 },
  notesInput: { minHeight: 96, paddingVertical: 12 },
});
