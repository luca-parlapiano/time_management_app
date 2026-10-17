import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { eventColors } from '../core/constants';
import { today } from '../core/utils/dates';
import { formatDurationMinutes } from '../core/utils/time';
import { usePlanner } from '../data/PlannerProvider';
import { ActionButton, AppScreen, DatabaseGate, Surface } from '../ui/Primitives';
import { useAppColors } from '../ui/theme';

/** Elenco mobile delle abitudini a step e degli obiettivi a ore. */
export function HabitsScreen() {
  const { snapshot, statistics, saving, recordTime, setTrophies } = usePlanner();
  const colors = useAppColors();
  const [mode, setMode] = useState<'steps' | 'hours'>('steps');
  const [timeHabitId, setTimeHabitId] = useState<string | null>(null);
  const [minutesText, setMinutesText] = useState('25');
  const [error, setError] = useState<string | null>(null);
  if (!snapshot || !statistics) return <DatabaseGate><></></DatabaseGate>;
  const archive = snapshot.archive;
  const saveMinutes = () => {
    const minutes = Number(minutesText);
    if (!timeHabitId || !Number.isSafeInteger(minutes) || minutes < 1 || minutes > 1440) {
      setError('Inserisci un numero di minuti da 1 a 1440.');
      return;
    }
    void recordTime(timeHabitId, minutes).then(() => { setError(null); setTimeHabitId(null); }).catch(cause => {
      setError(cause instanceof Error ? cause.message : 'Tempo non salvato.');
    });
  };
  return <AppScreen eyebrow="Un passo alla volta" title="Abitudini">
    <View style={[styles.segment, { backgroundColor: colors.soft }]}>
      {(['steps', 'hours'] as const).map(id => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: mode === id }} onPress={() => { setMode(id); setError(null); }} style={[styles.segmentButton, { backgroundColor: mode === id ? colors.surface : colors.soft }]}><Text style={{ color: mode === id ? colors.text : colors.muted, fontWeight: '700' }}>{id === 'steps' ? 'A step' : 'A ore'}</Text></Pressable>)}
    </View>
    {mode === 'steps' ? <>
      {(archive.habits ?? []).length === 0 ? <Surface colors={colors}><Text style={[styles.heading, { color: colors.text }]}>Il primo percorso parte da qui</Text><Text style={[styles.muted, { color: colors.muted }]}>Scegli un’abitudine e un traguardo alla tua portata.</Text></Surface> : (archive.habits ?? []).map(habit => {
        const progress = statistics.getHabitProgress(habit.id);
        const completedOn = statistics.getHabitCompletionDate(habit.id);
        return <Surface key={habit.id} colors={colors}>
          <View style={styles.row}><View style={[styles.colorBar, { backgroundColor: eventColors[habit.color].value }]} /><View style={styles.flex}><Text style={[styles.heading, { color: colors.text }]}>{habit.title}</Text><Text style={[styles.muted, { color: colors.muted }]}>{completedOn ? 'Serie conclusa' : `${progress.currentStep} di ${progress.target} step valutati`}</Text></View></View>
          {habit.motivation ? <Text style={[styles.muted, { color: colors.muted }]}>{habit.motivation}</Text> : null}
          <View style={[styles.track, { backgroundColor: colors.soft }]}><View style={[styles.fill, { width: `${progress.currentStep / progress.target * 100}%`, backgroundColor: eventColors[habit.color].value }]} /></View>
          <Text style={[styles.muted, { color: colors.muted }]}>{progress.completed} eventi fatti su {progress.target}</Text>
          <View style={styles.row}><Text style={[styles.muted, styles.flex, { color: colors.text }]}>Usa trofei per questa serie</Text><Switch value={Boolean(habit.trophiesEnabled)} disabled={saving} onValueChange={enabled => { void setTrophies(habit.id, enabled).catch(cause => setError(cause instanceof Error ? cause.message : 'Preferenza non salvata.')); }} trackColor={{ true: colors.accent }} /></View>
        </Surface>;
      })}
    </> : <>
      {(archive.weeklyTimeHabits ?? []).length === 0 ? <Surface colors={colors}><Text style={[styles.heading, { color: colors.text }]}>Fai spazio a ciò che vuoi imparare</Text><Text style={[styles.muted, { color: colors.muted }]}>Imposta un obiettivo settimanale o mensile di tempo.</Text></Surface> : (archive.weeklyTimeHabits ?? []).map(habit => {
        const progress = statistics.getWeeklyTimeProgress(habit.id, today());
        return <Surface key={habit.id} colors={colors}>
          <View style={styles.row}><View style={[styles.colorBar, { backgroundColor: eventColors[habit.color].value }]} /><View style={styles.flex}><Text style={[styles.heading, { color: colors.text }]}>{habit.title}</Text><Text style={[styles.muted, { color: colors.muted }]}>{habit.archivedOn ? 'Archiviata' : progress.period === 'month' ? 'Obiettivo mensile' : 'Obiettivo settimanale'}</Text></View></View>
          <Text style={[styles.muted, { color: colors.text }]}>{formatDurationMinutes(progress.completedMinutes)} su {formatDurationMinutes(progress.targetMinutes)} registrati</Text>
          <View style={[styles.track, { backgroundColor: colors.soft }]}><View style={[styles.fill, { width: `${Math.min(progress.percent, 100)}%`, backgroundColor: eventColors[habit.color].value }]} /></View>
          {!habit.archivedOn && <ActionButton label="Aggiungi tempo" secondary onPress={() => { setTimeHabitId(timeHabitId === habit.id ? null : habit.id); setError(null); }} />}
          {timeHabitId === habit.id && <View style={styles.entry}><TextInput accessibilityLabel="Minuti da aggiungere" keyboardType="number-pad" value={minutesText} onChangeText={setMinutesText} style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]} /><ActionButton label="Registra" disabled={saving} onPress={saveMinutes} /></View>}
        </Surface>;
      })}
    </>}
    {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
    <ActionButton label={mode === 'steps' ? 'Nuova abitudine a step' : 'Nuovo obiettivo a ore'} onPress={() => router.push({ pathname: '/new-habit', params: { mode } })} />
  </AppScreen>;
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  segmentButton: { flex: 1, minHeight: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  colorBar: { width: 8, height: 37, borderRadius: 6 },
  heading: { fontSize: 17, fontWeight: '700' },
  muted: { fontSize: 13, lineHeight: 19 },
  track: { height: 9, borderRadius: 8, overflow: 'hidden' },
  fill: { height: 9, borderRadius: 8 },
  entry: { gap: 10 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 16 },
});
