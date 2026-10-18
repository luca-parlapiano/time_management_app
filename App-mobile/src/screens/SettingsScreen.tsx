import { randomUUID } from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { palettes } from '../core/constants';
import { latestOutcomes } from '../core/domain/outcomeArchive';
import type { CalendarGoal, CalendarProfile } from '../core/model/calendar';
import type { PlannerArchive } from '../core/model/outcomeArchive';
import type { Palette } from '../core/model/theme';
import { usePlanner } from '../data/PlannerProvider';
import { ActionButton, AppScreen, DatabaseGate, Surface } from '../ui/Primitives';
import { useAppColors } from '../ui/theme';

const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

function messageOf(cause: unknown): string {
  return cause instanceof SyntaxError ? 'Il file non contiene un JSON valido.' : cause instanceof Error ? cause.message : 'Operazione non riuscita.';
}

async function shareBackup(text: string, name: string): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!await Sharing.isAvailableAsync()) throw new Error('Condivisione file non disponibile su questo dispositivo.');
  const file = new File(Paths.cache, name);
  await file.create({ overwrite: true });
  await file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Salva il backup di MindMorrow' });
}

function SettingsContent() {
  const { snapshot, palette, saving, changePalette, savePreferences, clearCalendar, resetAll, prepareImport, importBackup, exportBackup } = usePlanner();
  const colors = useAppColors();
  const calendar = snapshot!.archive.calendar;
  const [editingProfile, setEditingProfile] = useState(false);
  const [profile, setProfile] = useState<CalendarProfile>(calendar.profile ?? { name: '', notes: '' });
  const [goals, setGoals] = useState<CalendarGoal[]>(calendar.goals);
  const [candidate, setCandidate] = useState<PlannerArchive | null>(null);
  const [confirm, setConfirm] = useState<'clear' | 'reset' | null>(null);
  const [resetText, setResetText] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isError, setIsError] = useState(false);
  const unavailable = busy || saving;

  async function run(task: () => Promise<void>, success: string) {
    setBusy(true);
    setFeedback('');
    try {
      await task();
      setIsError(false);
      setFeedback(success);
    } catch (cause) {
      setIsError(true);
      setFeedback(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  async function pickBackup() {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        setBusy(true);
        setFeedback('');
        void file.text().then(text => {
          if (file.size > MAX_BACKUP_BYTES) throw new Error('Il backup supera il limite di 20 MB.');
          setCandidate(prepareImport(text));
        }).catch(cause => {
          setIsError(true);
          setFeedback(messageOf(cause));
        }).finally(() => setBusy(false));
      };
      input.click();
      return;
    }
    setBusy(true);
    setFeedback('');
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.size && asset.size > MAX_BACKUP_BYTES) throw new Error('Il backup supera il limite di 20 MB.');
      const text = await new File(asset.uri).text();
      if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error('Il backup supera il limite di 20 MB.');
      setCandidate(prepareImport(text));
    } catch (cause) {
      setIsError(true);
      setFeedback(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  function startProfile() {
    setProfile(calendar.profile ?? { name: '', notes: '' });
    setGoals(calendar.goals);
    setEditingProfile(true);
  }

  const inputStyle = [styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }];
  return <AppScreen eyebrow="Personalizza la tua app" title="Impostazioni" showSettings={false}>
    <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={[styles.back, { color: colors.accent }]}>‹ Torna all’app</Text></Pressable>
    {feedback ? <Text accessibilityRole="alert" style={[styles.feedback, { color: isError ? colors.danger : colors.accent }]}>{feedback}</Text> : null}

    <Surface colors={colors}>
      <Text style={[styles.heading, { color: colors.text }]}>Profilo e obiettivi</Text>
      {!editingProfile ? <>
        <Text style={[styles.copy, { color: colors.muted }]}>{calendar.profile ? `Profilo: ${calendar.profile.name.trim() || 'senza nome'} · ${calendar.goals.length} obiettivi` : 'Crea il tuo profilo e definisci gli obiettivi personali.'}</Text>
        <ActionButton label={calendar.profile ? 'Modifica profilo' : 'Crea profilo'} secondary onPress={startProfile} disabled={unavailable} />
      </> : <>
        <Text style={[styles.label, { color: colors.text }]}>Nome</Text>
        <TextInput accessibilityLabel="Nome" value={profile.name} onChangeText={name => setProfile(current => ({ ...current, name }))} style={inputStyle} placeholder="Il tuo nome" placeholderTextColor={colors.muted} />
        <Text style={[styles.label, { color: colors.text }]}>Note</Text>
        <TextInput accessibilityLabel="Note" multiline value={profile.notes} onChangeText={notes => setProfile(current => ({ ...current, notes }))} style={[inputStyle, styles.notes]} placeholder="Cosa vuoi ricordare?" placeholderTextColor={colors.muted} />
        <Text style={[styles.heading, { color: colors.text }]}>Obiettivi</Text>
        {goals.length === 0 && <Text style={[styles.copy, { color: colors.muted }]}>Non hai ancora aggiunto obiettivi.</Text>}
        {goals.map((goal, index) => <View key={goal.id} style={styles.goalRow}>
          <TextInput accessibilityLabel={`Obiettivo ${index + 1}`} value={goal.name} onChangeText={name => setGoals(current => current.map(entry => entry.id === goal.id ? { ...entry, name } : entry))} style={[inputStyle, styles.goalInput]} placeholder={`Obiettivo ${index + 1}`} placeholderTextColor={colors.muted} />
          <Pressable accessibilityRole="button" accessibilityLabel={`Elimina obiettivo ${goal.name || index + 1}`} onPress={() => setGoals(current => current.filter(entry => entry.id !== goal.id))} style={styles.removeGoal}><Text style={{ color: colors.danger, fontWeight: '700' }}>Elimina</Text></Pressable>
        </View>)}
        {calendar.goals.some(goal => !goals.some(entry => entry.id === goal.id)) && <Text style={[styles.copy, { color: colors.muted }]}>Le attività collegate agli obiettivi rimossi restano nel calendario.</Text>}
        <ActionButton label="Aggiungi obiettivo" secondary onPress={() => setGoals(current => [...current, { id: randomUUID(), name: '' }])} />
        <ActionButton label="Salva profilo" disabled={unavailable || goals.some(goal => !goal.name.trim())} onPress={() => void run(async () => { await savePreferences(profile, goals); setEditingProfile(false); }, 'Profilo salvato.')} />
        <ActionButton label="Annulla" secondary onPress={() => setEditingProfile(false)} />
      </>}
    </Surface>

    <Surface colors={colors}>
      <Text style={[styles.heading, { color: colors.text }]}>Palette dell’app</Text>
      {palettes.map(option => <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: palette === option.id }} disabled={unavailable} onPress={() => void run(() => changePalette(option.id as Palette), 'Palette salvata su questo dispositivo.')} style={[styles.paletteRow, { borderColor: palette === option.id ? colors.accent : colors.border, backgroundColor: palette === option.id ? colors.soft : colors.surface }]}>
        <View style={[styles.swatch, { backgroundColor: option.id === 'natural' ? '#267c5b' : option.id === 'studio' ? '#365edc' : '#b6a4ee' }]} />
        <View style={{ flex: 1 }}><Text style={[styles.label, { color: colors.text }]}>{option.label}</Text><Text style={[styles.copy, { color: colors.muted }]}>{option.description}</Text></View>
        <Text style={{ color: colors.accent, fontSize: 22 }}>{palette === option.id ? '✓' : ''}</Text>
      </Pressable>)}
      <Text style={[styles.copy, { color: colors.muted }]}>La scelta viene salvata su questo dispositivo.</Text>
    </Surface>

    <Surface colors={colors}>
      <Text style={[styles.heading, { color: colors.text }]}>Database locale e backup</Text>
      <Text style={[styles.copy, { color: colors.muted }]}>Calendario, abitudini, diario, profilo, obiettivi e storico degli esiti sono salvati su questo dispositivo. Esporta un backup per conservarli o trasferirli.</Text>
      <ActionButton label="Esporta backup" disabled={unavailable} onPress={() => void run(() => shareBackup(exportBackup(), 'mindmorrow-backup.json'), 'Backup pronto per il salvataggio.')} />
      <ActionButton label="Importa backup" secondary disabled={unavailable} onPress={() => void pickBackup()} />
      {snapshot!.previous && <ActionButton label="Esporta copia precedente" secondary disabled={unavailable} onPress={() => void run(() => shareBackup(exportBackup(true), 'mindmorrow-prima-importazione.json'), 'Copia precedente pronta per il salvataggio.')} />}
      {candidate && <View style={[styles.confirmBox, { backgroundColor: colors.soft, borderColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.text }]}>Importa backup</Text>
        <Text style={[styles.copy, { color: colors.text }]}>Il file contiene {candidate.calendar.items.length} elementi del calendario, {latestOutcomes(candidate.history).length} appuntamenti con esito, {candidate.weeklyTimeHabits?.length ?? 0} abitudini a ore e {candidate.timeSessions?.filter(session => !session.removed).length ?? 0} sessioni di tempo.</Text>
        <Text style={[styles.copy, { color: colors.muted }]}>Sostituirà i dati attuali. Una copia precedente sarà conservata automaticamente e potrai esportarla da qui.</Text>
        <ActionButton label="Conferma: sostituisci i dati" disabled={unavailable} onPress={() => void run(async () => { await importBackup(candidate); setCandidate(null); setEditingProfile(false); }, 'Backup importato. La copia precedente è disponibile per l’esportazione.')} />
        <ActionButton label="Annulla" secondary onPress={() => setCandidate(null)} />
      </View>}
    </Surface>

    <Surface colors={colors}>
      <Text style={[styles.heading, { color: colors.text }]}>Svuota calendario</Text>
      <Text style={[styles.copy, { color: colors.muted }]}>Rimuove appuntamenti e abitudini a step pianificate. Conserva le abitudini a ore, il loro diario, profilo, obiettivi e storico degli esiti.</Text>
      {confirm === 'clear' ? <View style={styles.confirmActions}>
        <Text style={[styles.label, { color: colors.danger }]}>Vuoi svuotare il calendario?</Text>
        <ActionButton label="Conferma svuotamento" disabled={unavailable} onPress={() => void run(async () => { await clearCalendar(); setConfirm(null); }, 'Calendario svuotato.')} />
        <ActionButton label="Annulla" secondary onPress={() => setConfirm(null)} />
      </View> : <ActionButton label="Svuota calendario" secondary disabled={unavailable || (calendar.items.length === 0 && (snapshot!.archive.habits?.length ?? 0) === 0)} onPress={() => setConfirm('clear')} />}
    </Surface>

    <Surface colors={colors}>
      <Text style={[styles.heading, { color: colors.text }]}>Ripristina tutto</Text>
      <Text style={[styles.copy, { color: colors.muted }]}>Elimina anche profilo, obiettivi, storico degli esiti, copia precedente e palette personalizzata. I file di backup già esportati restano disponibili.</Text>
      {confirm === 'reset' ? <View style={styles.confirmActions}>
        <Text style={[styles.label, { color: colors.danger }]}>Scrivi RESET per confermare</Text>
        <TextInput accessibilityLabel="Conferma ripristino" value={resetText} onChangeText={setResetText} autoCapitalize="characters" style={inputStyle} placeholder="RESET" placeholderTextColor={colors.muted} />
        <ActionButton label="Conferma ripristino" disabled={unavailable || resetText !== 'RESET'} onPress={() => void run(async () => { await resetAll(); setResetText(''); setConfirm(null); setEditingProfile(false); setCandidate(null); }, 'Tutti i dati locali sono stati ripristinati.')} />
        <ActionButton label="Annulla" secondary onPress={() => { setConfirm(null); setResetText(''); }} />
      </View> : <ActionButton label="Ripristina tutto" secondary disabled={unavailable} onPress={() => setConfirm('reset')} />}
    </Surface>
  </AppScreen>;
}

export function SettingsScreen() {
  return <DatabaseGate><SettingsContent /></DatabaseGate>;
}

const styles = StyleSheet.create({
  back: { fontSize: 15, fontWeight: '700', paddingVertical: 6 },
  heading: { fontSize: 19, fontWeight: '800' },
  copy: { fontSize: 14, lineHeight: 21 },
  label: { fontSize: 15, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontSize: 16 },
  notes: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalInput: { flex: 1 },
  removeGoal: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  paletteRow: { minHeight: 68, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8 },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  confirmBox: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 10 },
  confirmActions: { gap: 10 },
  feedback: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
});
