import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { eventColors, eventColorLabel, eventColorValue, eventIcons, MAX_MONTHLY_MINUTES, MAX_WEEKLY_MINUTES } from '../core/constants';
import type { EventColor, EventIcon } from '../core/model/calendar';
import type { HabitStepTarget } from '../core/model/habit';
import { today } from '../core/utils/dates';
import { usePlanner } from '../data/PlannerProvider';
import { ActionButton, AppScreen } from '../ui/Primitives';
import { EventIcon as HabitIcon } from '../ui/EventIcon';
import { useAppColors } from '../ui/theme';
import { ColorPickerModal, colorCheckText } from './ColorPickerModal';
import { IconPickerModal } from './IconPickerModal';

const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const colorOptions = Object.keys(eventColors) as (keyof typeof eventColors)[];

/** Crea una serie a step o a ore usando la validazione condivisa del dominio. */
export function NewHabitScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = params.mode === 'hours' ? 'hours' : 'steps';
  const { snapshot, createStepHabit, createTimeHabit, saving } = usePlanner();
  const colors = useAppColors();
  const weekday = (new Date().getDay() + 6) % 7;
  const [title, setTitle] = useState('');
  const [motivation, setMotivation] = useState('');
  const [icon, setIcon] = useState<EventIcon>(mode === 'steps' ? 'activity' : 'study');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [color, setColor] = useState<EventColor>(mode === 'steps' ? 'purple' : 'teal');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([weekday]);
  const [start, setStart] = useState('18:00');
  const [duration, setDuration] = useState('25');
  const [stepTarget, setStepTarget] = useState<HabitStepTarget>(5);
  const [targetHours, setTargetHours] = useState('3');
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [error, setError] = useState<string | null>(null);
  const selectedColor = eventColorValue(color);
  const customColors = [...new Set([...(snapshot?.archive.habits ?? []), ...(snapshot?.archive.weeklyTimeHabits ?? [])]
    .map(habit => habit.color).concat(color).filter(value => value.startsWith('#')))];
  const maxHours = (period === 'week' ? MAX_WEEKLY_MINUTES : MAX_MONTHLY_MINUTES) / 60;
  const hours = Number(targetHours.replace(',', '.'));
  const canAddHour = !Number.isFinite(hours) || hours < maxHours;
  const canRemoveHour = !Number.isFinite(hours) || hours > 1;
  const adjustHours = (change: number) => setTargetHours(current => {
    const value = Number(current.replace(',', '.'));
    const next = Math.min(maxHours, Math.max(1, (Number.isFinite(value) ? value : 0) + change));
    return String(Math.round(next * 60) / 60);
  });
  const selectPeriod = (value: 'week' | 'month') => {
    const limit = (value === 'week' ? MAX_WEEKLY_MINUTES : MAX_MONTHLY_MINUTES) / 60;
    setPeriod(value);
    setTargetHours(current => {
      const amount = Number(current.replace(',', '.'));
      return String(Number.isFinite(amount) ? Math.min(limit, Math.max(1, amount)) : 1);
    });
  };
  const toggleDay = (day: number) => setWeekdays(current => current.includes(day) ? current.filter(value => value !== day) : [...current, day].sort());
  const save = () => {
    const date = today();
    const operation = mode === 'steps'
      ? createStepHabit({ title, motivation, icon, color, stepTarget, startsOn: date, weekdays, start, durationMinutes: Number(duration) })
      : createTimeHabit({ title, motivation, icon, color, startsOn: date, targetMinutes: Math.round(hours * 60), period });
    void operation.then(() => router.back()).catch(cause => setError(cause instanceof Error ? cause.message : 'Impossibile creare l’abitudine.'));
  };
  return <AppScreen eyebrow="Nuovo percorso" title={mode === 'steps' ? 'Abitudine a step' : 'Obiettivo a ore'}>
    <Text style={[styles.label, { color: colors.text }]}>Nome dell’abitudine</Text>
    <TextInput accessibilityLabel="Nome dell’abitudine" value={title} onChangeText={setTitle} placeholder="Per esempio: leggere ogni giorno" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
    <Text style={[styles.label, { color: colors.text }]}>Perché vuoi farlo? (facoltativo)</Text>
    <TextInput accessibilityLabel="Motivazione" value={motivation} onChangeText={setMotivation} placeholder="Una frase per ricordare il tuo obiettivo" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
    <Text style={[styles.label, { color: colors.text }]}>Icona</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Scegli un’icona. Attuale: ${eventIcons[icon]}`} onPress={() => setIconPickerOpen(true)} style={[styles.iconPickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.chosenIcon, { backgroundColor: colors.soft }]}><HabitIcon icon={icon} color={selectedColor} /></View>
      <View style={styles.iconPickerText}><Text style={[styles.chosenIconName, { color: colors.text }]}>{eventIcons[icon]}</Text><Text style={[styles.iconPickerHint, { color: colors.muted }]}>Tocca per scegliere tra {Object.keys(eventIcons).length} icone</Text></View>
      <Text style={[styles.iconPickerArrow, { color: colors.accent }]}>›</Text>
    </Pressable>
    <IconPickerModal visible={iconPickerOpen} selected={icon} accent={selectedColor} onSelect={value => { setIcon(value); setIconPickerOpen(false); }} onClose={() => setIconPickerOpen(false)} />
    <Text style={[styles.label, { color: colors.text }]}>Colore</Text>
    <View style={styles.colorSection}>
      <View style={styles.colorRow}>{colorOptions.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={eventColors[value].label} accessibilityState={{ checked: color === value }} onPress={() => setColor(value)} style={styles.colorChoice}><View style={[styles.colorSwatch, { backgroundColor: eventColorValue(value), borderColor: color === value ? colors.text : 'transparent' }]}>{color === value && <Text style={styles.colorCheck}>✓</Text>}</View></Pressable>)}</View>
      <Pressable accessibilityRole="button" accessibilityLabel="Scegli un colore personalizzato" onPress={() => setColorPickerOpen(true)} style={[styles.customColorButton, { backgroundColor: colors.surface, borderColor: color.startsWith('#') ? selectedColor : colors.border }]}><View style={[styles.customSwatch, { backgroundColor: color.startsWith('#') ? selectedColor : colors.soft, borderColor: colors.border }]}><Text style={{ color: color.startsWith('#') ? colorCheckText(selectedColor) : colors.accent, fontWeight: '800', fontSize: 19 }}>{color.startsWith('#') ? '✓' : '+'}</Text></View><Text style={[styles.customColorText, { color: colors.text }]}>Altri colori o colore personale</Text><Text style={{ color: colors.accent, fontSize: 22 }}>›</Text></Pressable>
      <Text style={[styles.colorName, { color: colors.muted }]}>{eventColorLabel(color)}</Text>
    </View>
    <ColorPickerModal visible={colorPickerOpen} selected={color} recent={customColors} onSelect={value => { setColor(value); setColorPickerOpen(false); }} onClose={() => setColorPickerOpen(false)} />
    {mode === 'steps' ? <>
      <Text style={[styles.label, { color: colors.text }]}>Giorni della settimana</Text>
      <View style={styles.dayRow}>{days.map((label, index) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: weekdays.includes(index) }} accessibilityLabel={label} onPress={() => toggleDay(index)} style={[styles.day, { backgroundColor: weekdays.includes(index) ? colors.accent : colors.surface, borderColor: weekdays.includes(index) ? colors.accent : colors.border }]}><Text style={{ color: weekdays.includes(index) ? colors.accentText : colors.text, fontWeight: '700', fontSize: 12 }}>{label}</Text></Pressable>)}</View>
      <View style={styles.pair}><View style={styles.flex}><Text style={[styles.label, { color: colors.text }]}>Orario (HH:MM)</Text><TextInput accessibilityLabel="Orario" value={start} onChangeText={setStart} keyboardType="numbers-and-punctuation" style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} /></View><View style={styles.flex}><Text style={[styles.label, { color: colors.text }]}>Durata in minuti</Text><TextInput accessibilityLabel="Durata in minuti" value={duration} onChangeText={setDuration} keyboardType="number-pad" style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} /></View></View>
      <View style={styles.pair}><Text style={[styles.label, styles.flex, { color: colors.text }]}>Traguardo · {stepTarget} step</Text><Pressable accessibilityRole="button" accessibilityLabel="Uno step in meno" onPress={() => setStepTarget(Math.max(1, stepTarget - 1) as HabitStepTarget)} style={[styles.stepControl, { backgroundColor: colors.soft }]}><Text style={{ color: colors.text, fontSize: 20 }}>−</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Uno step in più" onPress={() => setStepTarget(Math.min(12, stepTarget + 1) as HabitStepTarget)} style={[styles.stepControl, { backgroundColor: colors.soft }]}><Text style={{ color: colors.text, fontSize: 20 }}>+</Text></Pressable></View>
    </> : <>
      <Text style={[styles.label, { color: colors.text }]}>Periodo</Text>
      <View style={styles.pair}>{(['week', 'month'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: period === value }} onPress={() => selectPeriod(value)} style={[styles.period, { backgroundColor: period === value ? colors.accent : colors.surface, borderColor: period === value ? colors.accent : colors.border }]}><Text style={{ color: period === value ? colors.accentText : colors.text, fontWeight: '700' }}>{value === 'week' ? 'Settimana' : 'Mese'}</Text></Pressable>)}</View>
      <Text style={[styles.label, { color: colors.text }]}>Ore da raggiungere</Text>
      <View style={styles.hoursControl}>
        <Pressable accessibilityRole="button" accessibilityLabel="Aggiungi un’ora" disabled={!canAddHour} onPress={() => adjustHours(1)} style={({ pressed }) => [styles.hoursButton, { backgroundColor: colors.accent, opacity: !canAddHour ? 0.45 : pressed ? 0.75 : 1 }]}><Text style={[styles.hoursSymbol, { color: colors.accentText }]}>+</Text></Pressable>
        <TextInput accessibilityLabel="Ore da raggiungere" value={targetHours} onChangeText={setTargetHours} keyboardType="decimal-pad" selectTextOnFocus style={[styles.hoursInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Togli un’ora" disabled={!canRemoveHour} onPress={() => adjustHours(-1)} style={({ pressed }) => [styles.hoursButton, { backgroundColor: colors.soft, opacity: !canRemoveHour ? 0.45 : pressed ? 0.75 : 1 }]}><Text style={[styles.hoursSymbol, { color: colors.text }]}>−</Text></Pressable>
      </View>
    </>}
    {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
    <ActionButton label={saving ? 'Salvataggio…' : 'Crea abitudine'} disabled={saving || !title.trim()} onPress={save} />
    <ActionButton label="Annulla" secondary onPress={() => router.back()} />
  </AppScreen>;
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontSize: 16 },
  iconPickerButton: { minHeight: 66, borderWidth: 1, borderRadius: 13, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 11 },
  chosenIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  iconPickerText: { flex: 1, minWidth: 0, gap: 2 },
  chosenIconName: { fontSize: 15, fontWeight: '800' },
  iconPickerHint: { fontSize: 12 },
  iconPickerArrow: { fontSize: 25, fontWeight: '700' },
  colorSection: { gap: 4 },
  colorRow: { flexDirection: 'row' },
  colorChoice: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  colorSwatch: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, borderWidth: 2 },
  colorCheck: { color: '#ffffff', fontSize: 20, fontWeight: '800', lineHeight: 24 },
  colorName: { fontSize: 13, fontWeight: '700' },
  customColorButton: { minHeight: 54, borderWidth: 1.5, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 },
  customSwatch: { width: 34, height: 34, borderWidth: 1, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  customColorText: { flex: 1, fontSize: 14, fontWeight: '700' },
  dayRow: { flexDirection: 'row', gap: 5 },
  day: { flex: 1, minHeight: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1 },
  pair: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  flex: { flex: 1 },
  stepControl: { width: 45, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  period: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1 },
  hoursControl: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  hoursButton: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hoursSymbol: { fontSize: 30, fontWeight: '700', lineHeight: 36 },
  hoursInput: { flex: 1, minWidth: 0, height: 64, borderWidth: 1, borderRadius: 16, textAlign: 'center', fontSize: 24, fontWeight: '700' },
});
