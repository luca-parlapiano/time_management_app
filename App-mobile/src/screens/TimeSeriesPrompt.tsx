import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { displayDate, today } from '../core/utils/dates';
import { formatDurationMinutes } from '../core/utils/time';
import { usePlanner } from '../data/PlannerProvider';
import { ActionButton } from '../ui/Primitives';
import { useAppColors } from '../ui/theme';

/** Chiede una scelta per ogni serie raggiunta o scaduta; la chiusura rimanda soltanto la domanda. */
export function TimeSeriesPrompt() {
  const { statistics, requestedTimeSeries, clearRequestedTimeSeries, resolveTimeSeries, saving } = usePlanner();
  const colors = useAppColors();
  const [deferred, setDeferred] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reference = today();
  const pending = statistics?.getTimeSeriesResults(reference).filter(entry => !entry.series.decision && (entry.reached || entry.series.endsOn < reference)) ?? [];
  const keyOf = (habitId: string, seriesId: string) => `${habitId}:${seriesId}`;
  const requested = requestedTimeSeries && pending.find(entry => entry.habit.id === requestedTimeSeries.habitId && entry.series.id === requestedTimeSeries.seriesId);
  const result = requested || pending.find(entry => !deferred.includes(keyOf(entry.habit.id, entry.series.id)));

  const dismiss = () => {
    if (saving) return;
    if (result) setDeferred(current => [...current, keyOf(result.habit.id, result.series.id)]);
    clearRequestedTimeSeries();
    setError(null);
  };
  const decide = async (repeat: boolean) => {
    if (!result) return;
    try {
      await resolveTimeSeries(result.habit.id, result.series.id, repeat);
      clearRequestedTimeSeries();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossibile concludere la serie.');
    }
  };

  return <Modal visible={Boolean(result)} transparent animationType="fade" onRequestClose={dismiss}>
    <View style={styles.backdrop}>
      {result && <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.header}><Text style={[styles.title, { color: colors.text }]}>La tua serie è terminata</Text><Pressable accessibilityRole="button" accessibilityLabel="Chiudi" disabled={saving} onPress={dismiss}><Text style={[styles.close, { color: colors.muted }]}>×</Text></Pressable></View>
        {result.reached && result.series.trophiesEnabled && <Text style={[styles.trophy, { color: colors.accent }]}>✓ Obiettivo raggiunto! Concludi la serie per aggiungere il trofeo alla raccolta.</Text>}
        <Text style={[styles.habit, { color: colors.text }]}>{result.habit.title}</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>{displayDate(result.series.startsOn, { year: 'numeric' })} – {displayDate(result.series.closedOn ?? (result.reached && result.series.endsOn > reference ? reference : result.series.endsOn), { year: 'numeric' })}</Text>
        <View style={styles.scores}><Text style={[styles.score, { color: colors.text }]}>Obiettivo: {formatDurationMinutes(result.series.targetMinutes)}</Text><Text style={[styles.score, { color: colors.text }]}>Ore raggiunte: {formatDurationMinutes(result.completedMinutes)}</Text></View>
        {!result.reached && <Text style={[styles.muted, { color: colors.muted }]}>Ogni ora dedicata resta parte del tuo percorso. Il risultato sarà conservato nello storico.</Text>}
        <Text style={[styles.question, { color: colors.text }]}>Vuoi continuare con una nuova serie?</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>Stesso obiettivo, {result.series.period === 'month' ? 'nel mese corrente' : 'nella settimana corrente'}, partendo da oggi con zero ore. Le ore eccedenti restano qui.</Text>
        {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
        <ActionButton label="Ripeti la serie" disabled={saving} onPress={() => { void decide(true); }} />
        <ActionButton label="Va bene così" secondary disabled={saving} onPress={() => { void decide(false); }} />
      </View>}
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#00000088' },
  card: { borderWidth: 1, borderRadius: 22, padding: 20, gap: 13, maxWidth: 440, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 22, fontWeight: '800', flex: 1 },
  close: { fontSize: 29, lineHeight: 30, paddingHorizontal: 4 },
  habit: { fontSize: 18, fontWeight: '700' },
  trophy: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  muted: { fontSize: 14, lineHeight: 21 },
  scores: { gap: 5 },
  score: { fontSize: 15, fontWeight: '700' },
  question: { fontSize: 17, fontWeight: '800', marginTop: 3 },
});
