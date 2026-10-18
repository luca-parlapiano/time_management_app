import { randomUUID } from 'expo-crypto';
import type { Dispatch, SetStateAction } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { CalendarGoal, CalendarProfile, CalendarState } from '../../core/model/calendar';
import { ActionButton, Surface } from '../../ui/Primitives';
import type { AppColors } from '../../ui/theme';
import { styles } from './styles';

/** Modifica profilo e obiettivi; la schermata coordina il salvataggio confermato. */
export function ProfileGoalsSection({ calendar, editing, profile, setProfile, goals, setGoals,
  onStart, onCancel, onSave, unavailable, colors }: {
  calendar: CalendarState;
  editing: boolean;
  profile: CalendarProfile;
  setProfile: Dispatch<SetStateAction<CalendarProfile>>;
  goals: CalendarGoal[];
  setGoals: Dispatch<SetStateAction<CalendarGoal[]>>;
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
  unavailable: boolean;
  colors: AppColors;
}) {
  const inputStyle = [styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }];
  return <Surface colors={colors}>
    <Text style={[styles.heading, { color: colors.text }]}>Profilo e obiettivi</Text>
    {!editing ? <>
      <Text style={[styles.copy, { color: colors.muted }]}>
        {calendar.profile
          ? `Profilo: ${calendar.profile.name.trim() || 'senza nome'} · ${calendar.goals.length} obiettivi`
          : 'Crea il tuo profilo e definisci gli obiettivi personali.'}
      </Text>
      <ActionButton label={calendar.profile ? 'Modifica profilo' : 'Crea profilo'} secondary onPress={onStart} disabled={unavailable} />
    </> : <>
      <Text style={[styles.label, { color: colors.text }]}>Nome</Text>
      <TextInput accessibilityLabel="Nome" value={profile.name} onChangeText={name => setProfile(current => ({ ...current, name }))}
        style={inputStyle} placeholder="Il tuo nome" placeholderTextColor={colors.muted} />
      <Text style={[styles.label, { color: colors.text }]}>Note</Text>
      <TextInput accessibilityLabel="Note" multiline value={profile.notes} onChangeText={notes => setProfile(current => ({ ...current, notes }))}
        style={[inputStyle, styles.notes]} placeholder="Cosa vuoi ricordare?" placeholderTextColor={colors.muted} />
      <Text style={[styles.heading, { color: colors.text }]}>Obiettivi</Text>
      {goals.length === 0 && <Text style={[styles.copy, { color: colors.muted }]}>Non hai ancora aggiunto obiettivi.</Text>}
      {goals.map((goal, index) => <View key={goal.id} style={styles.goalRow}>
        <TextInput accessibilityLabel={`Obiettivo ${index + 1}`} value={goal.name}
          onChangeText={name => setGoals(current => current.map(entry => entry.id === goal.id ? { ...entry, name } : entry))}
          style={[inputStyle, styles.goalInput]} placeholder={`Obiettivo ${index + 1}`} placeholderTextColor={colors.muted} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Elimina obiettivo ${goal.name || index + 1}`}
          onPress={() => setGoals(current => current.filter(entry => entry.id !== goal.id))} style={styles.removeGoal}>
          <Text style={{ color: colors.danger, fontWeight: '700' }}>Elimina</Text>
        </Pressable>
      </View>)}
      {calendar.goals.some(goal => !goals.some(entry => entry.id === goal.id)) && <Text style={[styles.copy, { color: colors.muted }]}>
        Le attività collegate agli obiettivi rimossi restano nel calendario.
      </Text>}
      <ActionButton label="Aggiungi obiettivo" secondary onPress={() => setGoals(current => [...current, { id: randomUUID(), name: '' }])} />
      <ActionButton label="Salva profilo" disabled={unavailable || goals.some(goal => !goal.name.trim())} onPress={onSave} />
      <ActionButton label="Annulla" secondary onPress={onCancel} />
    </>}
  </Surface>;
}
