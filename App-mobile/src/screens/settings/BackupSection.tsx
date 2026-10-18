import { Text, View } from 'react-native';
import { latestOutcomes } from '../../core/domain/outcomeArchive';
import type { DatabaseSnapshot } from '../../core/model/database';
import type { PlannerArchive } from '../../core/model/outcomeArchive';
import { ActionButton, Surface } from '../../ui/Primitives';
import type { AppColors } from '../../ui/theme';
import { styles } from './styles';

/** Esportazione, scelta del file e conferma dell'importazione. */
export function BackupSection({ snapshot, candidate, onExport, onPick, onImport, onCancel,
  unavailable, colors }: {
  snapshot: DatabaseSnapshot;
  candidate: PlannerArchive | null;
  onExport: (previous: boolean) => void;
  onPick: () => void;
  onImport: () => void;
  onCancel: () => void;
  unavailable: boolean;
  colors: AppColors;
}) {
  return <Surface colors={colors}>
    <Text style={[styles.heading, { color: colors.text }]}>Database locale e backup</Text>
    <Text style={[styles.copy, { color: colors.muted }]}>
      Calendario, abitudini, diario, profilo, obiettivi e storico degli esiti sono salvati su questo dispositivo.
      Esporta un backup per conservarli o trasferirli.
    </Text>
    <ActionButton label="Esporta backup" disabled={unavailable} onPress={() => onExport(false)} />
    <ActionButton label="Importa backup" secondary disabled={unavailable} onPress={onPick} />
    {snapshot.previous && <ActionButton label="Esporta copia precedente" secondary disabled={unavailable} onPress={() => onExport(true)} />}
    {candidate && <View style={[styles.confirmBox, { backgroundColor: colors.soft, borderColor: colors.border }]}>
      <Text style={[styles.heading, { color: colors.text }]}>Importa backup</Text>
      <Text style={[styles.copy, { color: colors.text }]}>
        Il file contiene {candidate.calendar.items.length} elementi del calendario,
        {' '}{latestOutcomes(candidate.history).length} appuntamenti con esito,
        {' '}{candidate.weeklyTimeHabits?.length ?? 0} abitudini a ore e
        {' '}{candidate.timeSessions?.filter(session => !session.removed).length ?? 0} sessioni di tempo.
      </Text>
      <Text style={[styles.copy, { color: colors.muted }]}>
        Sostituirà i dati attuali. Una copia precedente sarà conservata automaticamente e potrai esportarla da qui.
      </Text>
      <ActionButton label="Conferma: sostituisci i dati" disabled={unavailable} onPress={onImport} />
      <ActionButton label="Annulla" secondary onPress={onCancel} />
    </View>}
  </Surface>;
}
