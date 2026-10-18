import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Platform, Pressable, Text } from 'react-native';
import type { CalendarGoal, CalendarProfile } from '../core/model/calendar';
import type { PlannerArchive } from '../core/model/outcomeArchive';
import { usePlanner } from '../data/PlannerProvider';
import { AppScreen, DatabaseGate } from '../ui/Primitives';
import { useAppColors } from '../ui/theme';
import { BackupSection } from './settings/BackupSection';
import { PaletteSection } from './settings/PaletteSection';
import { ProfileGoalsSection } from './settings/ProfileGoalsSection';
import { ClearCalendarSection, ResetAllSection } from './settings/ResetSections';
import { styles } from './settings/styles';

const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

function messageOf(cause: unknown): string {
  return cause instanceof SyntaxError ? 'Il file non contiene un JSON valido.'
    : cause instanceof Error ? cause.message : 'Operazione non riuscita.';
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

/** Coordina le operazioni di impostazioni; ogni sezione rende una sola funzione dell'interfaccia. */
function SettingsContent() {
  const { snapshot, palette, saving, changePalette, savePreferences, clearCalendar,
    resetAll, prepareImport, importBackup, exportBackup } = usePlanner();
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
    // La scelta prepara soltanto una candidatura; i dati correnti cambiano dopo la conferma esplicita.
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

  const startProfile = () => {
    setProfile(calendar.profile ?? { name: '', notes: '' });
    setGoals(calendar.goals);
    setEditingProfile(true);
  };

  return <AppScreen eyebrow="Personalizza la tua app" title="Impostazioni" showSettings={false}>
    <Pressable accessibilityRole="button" onPress={() => router.back()}>
      <Text style={[styles.back, { color: colors.accent }]}>‹ Torna all’app</Text>
    </Pressable>
    {feedback ? <Text accessibilityRole="alert" style={[styles.feedback, { color: isError ? colors.danger : colors.accent }]}>{feedback}</Text> : null}

    <ProfileGoalsSection calendar={calendar} editing={editingProfile} profile={profile} setProfile={setProfile}
      goals={goals} setGoals={setGoals} onStart={startProfile} onCancel={() => setEditingProfile(false)}
      onSave={() => void run(async () => { await savePreferences(profile, goals); setEditingProfile(false); }, 'Profilo salvato.')}
      unavailable={unavailable} colors={colors} />

    <PaletteSection palette={palette} unavailable={unavailable} colors={colors}
      onChange={value => void run(() => changePalette(value), 'Palette salvata su questo dispositivo.')} />

    <BackupSection snapshot={snapshot!} candidate={candidate} unavailable={unavailable} colors={colors}
      onExport={previous => void run(() => shareBackup(exportBackup(previous), previous
        ? 'mindmorrow-prima-importazione.json' : 'mindmorrow-backup.json'), previous
        ? 'Copia precedente pronta per il salvataggio.' : 'Backup pronto per il salvataggio.')}
      onPick={() => { void pickBackup(); }}
      onImport={() => { if (candidate) void run(async () => {
        await importBackup(candidate);
        setCandidate(null);
        setEditingProfile(false);
      }, 'Backup importato. La copia precedente è disponibile per l’esportazione.'); }}
      onCancel={() => setCandidate(null)} />

    <ClearCalendarSection confirming={confirm === 'clear'} unavailable={unavailable}
      disabled={calendar.items.length === 0 && (snapshot!.archive.habits?.length ?? 0) === 0}
      onStart={() => setConfirm('clear')} onCancel={() => setConfirm(null)}
      onConfirm={() => void run(async () => { await clearCalendar(); setConfirm(null); }, 'Calendario svuotato.')}
      colors={colors} />

    <ResetAllSection confirming={confirm === 'reset'} resetText={resetText} onResetText={setResetText}
      unavailable={unavailable} colors={colors} onStart={() => setConfirm('reset')}
      onCancel={() => { setConfirm(null); setResetText(''); }}
      onConfirm={() => void run(async () => {
        await resetAll();
        setResetText('');
        setConfirm(null);
        setEditingProfile(false);
        setCandidate(null);
      }, 'Tutti i dati locali sono stati ripristinati.')} />
  </AppScreen>;
}

export function SettingsScreen() {
  return <DatabaseGate><SettingsContent /></DatabaseGate>;
}
