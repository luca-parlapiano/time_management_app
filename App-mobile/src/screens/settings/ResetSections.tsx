import { Text, TextInput, View } from 'react-native';
import { ActionButton, Surface } from '../../ui/Primitives';
import type { AppColors } from '../../ui/theme';
import { styles } from './styles';

/** Conferma esplicita dello svuotamento del solo calendario. */
export function ClearCalendarSection({ confirming, onStart, onConfirm, onCancel, unavailable, disabled, colors }: {
  confirming: boolean;
  onStart: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  unavailable: boolean;
  disabled: boolean;
  colors: AppColors;
}) {
  return <Surface colors={colors}>
    <Text style={[styles.heading, { color: colors.text }]}>Svuota calendario</Text>
    <Text style={[styles.copy, { color: colors.muted }]}>
      Rimuove appuntamenti e abitudini a step pianificate. Conserva le abitudini a ore, il loro diario,
      profilo, obiettivi e storico degli esiti.
    </Text>
    {confirming ? <View style={styles.confirmActions}>
      <Text style={[styles.label, { color: colors.danger }]}>Vuoi svuotare il calendario?</Text>
      <ActionButton label="Conferma svuotamento" disabled={unavailable} onPress={onConfirm} />
      <ActionButton label="Annulla" secondary onPress={onCancel} />
    </View> : <ActionButton label="Svuota calendario" secondary disabled={unavailable || disabled} onPress={onStart} />}
  </Surface>;
}

/** Ripristino completo protetto dalla parola RESET. */
export function ResetAllSection({ confirming, resetText, onResetText, onStart, onConfirm, onCancel, unavailable, colors }: {
  confirming: boolean;
  resetText: string;
  onResetText: (text: string) => void;
  onStart: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  unavailable: boolean;
  colors: AppColors;
}) {
  return <Surface colors={colors}>
    <Text style={[styles.heading, { color: colors.text }]}>Ripristina tutto</Text>
    <Text style={[styles.copy, { color: colors.muted }]}>
      Elimina anche profilo, obiettivi, storico degli esiti, copia precedente e palette personalizzata.
      I file di backup già esportati restano disponibili.
    </Text>
    {confirming ? <View style={styles.confirmActions}>
      <Text style={[styles.label, { color: colors.danger }]}>Scrivi RESET per confermare</Text>
      <TextInput accessibilityLabel="Conferma ripristino" value={resetText} onChangeText={onResetText}
        autoCapitalize="characters" style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
        placeholder="RESET" placeholderTextColor={colors.muted} />
      <ActionButton label="Conferma ripristino" disabled={unavailable || resetText !== 'RESET'} onPress={onConfirm} />
      <ActionButton label="Annulla" secondary onPress={onCancel} />
    </View> : <ActionButton label="Ripristina tutto" secondary disabled={unavailable} onPress={onStart} />}
  </Surface>;
}
