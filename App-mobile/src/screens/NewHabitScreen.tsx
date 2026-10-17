import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { eventColors } from '../core/constants';
import type { EventColor, EventIcon } from '../core/model/calendar';
import type { HabitStepTarget } from '../core/model/habit';
import { today } from '../core/utils/dates';
import { usePlanner } from '../data/PlannerProvider';
import { ActionButton, AppScreen } from '../ui/Primitives';
import { useAppColors } from '../ui/theme';

const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const iconOptions: { id: EventIcon; label: string; color: EventColor }[] = [
  { id: 'study', label: 'Studio', color: 'blue' }, { id: 'sport', label: 'Sport', color: 'green' },
  { id: 'heart', label: 'Benessere', color: 'pink' }, { id: 'work', label: 'Lavoro', color: 'purple' },
  { id: 'activity', label: 'Altro', color: 'orange' },
];

/** Crea una serie a step o a ore usando la validazione condivisa del dominio. */
export function NewHabitScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = params.mode === 'hours' ? 'hours' : 'steps';
  const { createStepHabit, createTimeHabit, saving } = usePlanner();
  const colors = useAppColors();
  const weekday = (new Date().getDay() + 6) % 7;
  const [title, setTitle] = useState('');
  const [motivation, setMotivation] = useState('');
  const [icon, setIcon] = useState<EventIcon>('study');
  const [weekdays, setWeekdays] = useState<number[]>([weekday]);
  const [start, setStart] = useState('18:00');
  const [duration, setDuration] = useState('25');
  const [stepTarget, setStepTarget] = useState<HabitStepTarget>(5);
  const [targetHours, setTargetHours] = useState('3');
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [trophiesEnabled, setTrophiesEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = iconOptions.find(option => option.id === icon)!;
  const color = selected.color;
  const toggleDay = (day: number) => setWeekdays(current => current.includes(day) ? current.filter(value => value !== day) : [...current, day].sort());
  const save = () => {
    const date = today();
    const operation = mode === 'steps'
      ? createStepHabit({ title, motivation, icon, color, stepTarget, trophiesEnabled, startsOn: date, weekdays, start, durationMinutes: Number(duration) })
      : createTimeHabit({ title, motivation, icon, color, startsOn: date, targetMinutes: Number(targetHours) * 60, period, trophiesEnabled });
    void operation.then(() => router.back()).catch(cause => setError(cause instanceof Error ? cause.message : 'Impossibile creare l’abitudine.'));
  };
  return <AppScreen eyebrow="Nuovo percorso" title={mode === 'steps' ? 'Abitudine a step' : 'Obiettivo a ore'}>
    <Text style={[styles.label, { color: colors.text }]}>Nome dell’abitudine</Text>
    <TextInput accessibilityLabel="Nome dell’abitudine" value={title} onChangeText={setTitle} placeholder="Per esempio: leggere ogni giorno" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
    <Text style={[styles.label, { color: colors.text }]}>Perché vuoi farlo? (facoltativo)</Text>
    <TextInput accessibilityLabel="Motivazione" value={motivation} onChangeText={setMotivation} placeholder="Una frase per ricordare il tuo obiettivo" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
    <Text style={[styles.label, { color: colors.text }]}>Categoria</Text>
    <View style={styles.wrap}>{iconOptions.map(option => <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected: icon === option.id }} onPress={() => setIcon(option.id)} style={[styles.choice, { borderColor: icon === option.id ? eventColors[option.color].value : colors.border, backgroundColor: icon === option.id ? colors.soft : colors.surface }]}><Text style={{ color: colors.text, fontWeight: '700' }}>{option.label}</Text></Pressable>)}</View>
    {mode === 'steps' ? <>
      <Text style={[styles.label, { color: colors.text }]}>Giorni della settimana</Text>
      <View style={styles.dayRow}>{days.map((label, index) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: weekdays.includes(index) }} accessibilityLabel={label} onPress={() => toggleDay(index)} style={[styles.day, { backgroundColor: weekdays.includes(index) ? colors.accent : colors.surface, borderColor: weekdays.includes(index) ? colors.accent : colors.border }]}><Text style={{ color: weekdays.includes(index) ? colors.accentText : colors.text, fontWeight: '700', fontSize: 12 }}>{label}</Text></Pressable>)}</View>
      <View style={styles.pair}><View style={styles.flex}><Text style={[styles.label, { color: colors.text }]}>Orario (HH:MM)</Text><TextInput accessibilityLabel="Orario" value={start} onChangeText={setStart} keyboardType="numbers-and-punctuation" style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} /></View><View style={styles.flex}><Text style={[styles.label, { color: colors.text }]}>Durata in minuti</Text><TextInput accessibilityLabel="Durata in minuti" value={duration} onChangeText={setDuration} keyboardType="number-pad" style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} /></View></View>
      <View style={styles.pair}><Text style={[styles.label, styles.flex, { color: colors.text }]}>Traguardo · {stepTarget} step</Text><Pressable accessibilityRole="button" accessibilityLabel="Uno step in meno" onPress={() => setStepTarget(Math.max(1, stepTarget - 1) as HabitStepTarget)} style={[styles.stepControl, { backgroundColor: colors.soft }]}><Text style={{ color: colors.text, fontSize: 20 }}>−</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Uno step in più" onPress={() => setStepTarget(Math.min(12, stepTarget + 1) as HabitStepTarget)} style={[styles.stepControl, { backgroundColor: colors.soft }]}><Text style={{ color: colors.text, fontSize: 20 }}>+</Text></Pressable></View>
    </> : <>
      <Text style={[styles.label, { color: colors.text }]}>Periodo</Text>
      <View style={styles.pair}>{(['week', 'month'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: period === value }} onPress={() => setPeriod(value)} style={[styles.period, { backgroundColor: period === value ? colors.accent : colors.surface, borderColor: period === value ? colors.accent : colors.border }]}><Text style={{ color: period === value ? colors.accentText : colors.text, fontWeight: '700' }}>{value === 'week' ? 'Settimana' : 'Mese'}</Text></Pressable>)}</View>
      <Text style={[styles.label, { color: colors.text }]}>Ore da raggiungere</Text><TextInput accessibilityLabel="Ore da raggiungere" value={targetHours} onChangeText={setTargetHours} keyboardType="decimal-pad" style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
    </>}
    <View style={styles.pair}><View style={styles.flex}><Text style={[styles.label, { color: colors.text }]}>Usa trofei</Text><Text style={{ color: colors.muted, fontSize: 12 }}>Un premio solo se raggiungi il traguardo.</Text></View><Switch value={trophiesEnabled} onValueChange={setTrophiesEnabled} trackColor={{ true: colors.accent }} /></View>
    {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
    <ActionButton label={saving ? 'Salvataggio…' : 'Crea abitudine'} disabled={saving || !title.trim()} onPress={save} />
    <ActionButton label="Annulla" secondary onPress={() => router.back()} />
  </AppScreen>;
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontSize: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 42, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 12, borderWidth: 1 },
  dayRow: { flexDirection: 'row', gap: 5 },
  day: { flex: 1, minHeight: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1 },
  pair: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  flex: { flex: 1 },
  stepControl: { width: 45, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  period: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1 },
});
