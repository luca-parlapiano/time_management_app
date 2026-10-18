import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { usePlanner } from '../data/PlannerProvider';
import { useAppColors } from './theme';
import type { AppColors } from './theme';

interface AppScreenProps {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  showSettings?: boolean;
  scrollable?: boolean;
}

/** Contenitore delle schede principali; lascia scorrere il contenuto o ospita una lista virtualizzata. */
export function AppScreen({ children, title, eyebrow, showSettings = true, scrollable = true }: AppScreenProps) {
  const colors = useAppColors();
  const content = <>
    {eyebrow && <Text style={[styles.eyebrow, { color: colors.accent }]}>{eyebrow}</Text>}
    <View style={styles.headerRow}>
      <Text style={[styles.title, { color: colors.text, flex: 1 }]}>{title}</Text>
      {showSettings && <Pressable accessibilityRole="button" accessibilityLabel="Apri impostazioni"
        onPress={() => router.push('/settings')}
        style={({ pressed }) => [styles.settingsButton, {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        }]}>
        <SymbolView name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
          tintColor={colors.accent} size={24} />
      </Pressable>}
    </View>
    {children}
  </>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
    {/* La lista figlia deve essere l'unico contenitore scorrevole per mantenere attiva la virtualizzazione. */}
    {scrollable
      ? <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{content}</ScrollView>
      : <View style={[styles.content, styles.fixedContent]}>{content}</View>}
  </SafeAreaView>;
}

/** Pulsante primario o secondario con superficie ampia per il tocco. */
export function ActionButton({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  const colors = useAppColors();
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, {
    backgroundColor: secondary ? colors.surface : colors.accent,
    borderColor: secondary ? colors.border : colors.accent,
    opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
  }]}><Text style={[styles.buttonText, { color: secondary ? colors.text : colors.accentText }]}>{label}</Text></Pressable>;
}

/** Riquadro del prodotto usato per progressi e operazioni della giornata. */
export function Surface({ children, colors }: { children: ReactNode; colors: AppColors }) {
  return <View style={[styles.surface, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>;
}

/** Stato iniziale o errore del database con possibilità di riprovare. */
export function DatabaseGate({ children }: { children: ReactNode }) {
  const { snapshot, error, retry } = usePlanner();
  const colors = useAppColors();
  if (snapshot) return <>{children}</>;
  return <SafeAreaView style={[styles.gate, { backgroundColor: colors.background }]}>
    {error ? <><Text style={[styles.gateTitle, { color: colors.text }]}>Archivio non disponibile</Text><Text style={[styles.gateMessage, { color: colors.danger }]}>{error}</Text><ActionButton label="Riprova" onPress={() => { void retry(); }} /></>
      : <><ActivityIndicator color={colors.accent} /><Text style={[styles.gateMessage, { color: colors.muted }]}>Apertura del database locale…</Text></>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32, gap: 14 },
  fixedContent: { flex: 1 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { fontSize: 31, fontWeight: '800', letterSpacing: -0.7, marginBottom: 5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  surface: { borderWidth: 1, borderRadius: 20, padding: 17, gap: 10 },
  button: { minHeight: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonText: { fontSize: 15, fontWeight: '700' },
  gate: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 28 },
  gateTitle: { fontSize: 21, fontWeight: '800', textAlign: 'center' },
  gateMessage: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
