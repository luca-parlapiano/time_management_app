import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { eventColors } from '../core/constants';
import { useAppColors } from '../ui/theme';

type Choice = 'steps' | 'hours';

/** Riprende le due scelte del desktop in una modale mobile raggiungibile dal pulsante Crea. */
export function CreationChoiceScreen() {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const close = () => router.canGoBack() ? router.back() : router.replace('/');
  const choose = (mode: Choice) => router.replace({ pathname: '/new-habit', params: { mode } });
  return <View style={styles.overlay}>
    <Pressable accessibilityRole="button" accessibilityLabel="Chiudi la scelta" onPress={close} style={StyleSheet.absoluteFill} />
    <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={[styles.handle, { backgroundColor: colors.border }]} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>NUOVO PERCORSO</Text>
            <Text style={[styles.title, { color: colors.text }]}>Che tipo di abitudine vuoi creare?</Text>
          </View>
          <LottieView source={require('../../assets/animations/creation-steps.json')} autoPlay loop={false} style={styles.animation} webStyle={{ width: 90, height: 90 }} />
        </View>
        <Text style={[styles.intro, { color: colors.muted }]}>Scegli se seguire un traguardo di eventi o di tempo.</Text>
        <ChoiceCard kind="steps" accent={eventColors.purple.value} title="Un passo alla volta" label="Abitudine a step" description="Parti da un piccolo traguardo: da 1 a 12 eventi per allenare una nuova abitudine." action="Scegli gli step" onPress={() => choose('steps')} colors={colors} />
        <ChoiceCard kind="hours" accent={eventColors.teal.value} title="Con un obiettivo di ore" label="Obiettivo di ore" description="Scegli le ore da raggiungere in una settimana o in un mese e registra i tuoi progressi." action="Scegli le ore" onPress={() => choose('hours')} colors={colors} />
        <Pressable accessibilityRole="button" onPress={close} style={[styles.closeButton, { borderColor: colors.border }]}><Text style={[styles.closeText, { color: colors.text }]}>Annulla</Text></Pressable>
      </ScrollView>
    </View>
  </View>;
}

function ChoiceCard({ kind, accent, title, label, description, action, onPress, colors }: { kind: Choice; accent: string; title: string; label: string; description: string; action: string; onPress: () => void; colors: ReturnType<typeof useAppColors> }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}. ${title}`} accessibilityHint={description} onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: `${accent}66`, opacity: pressed ? 0.75 : 1 }]}>
    <View style={styles.cardTop}><View style={[styles.iconBox, { backgroundColor: `${accent}1f` }]}><ChoiceIcon kind={kind} color={accent} /></View><Text style={[styles.cardLabel, { color: accent }]}>{label}</Text></View>
    <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
    <Text style={[styles.cardDescription, { color: colors.muted }]}>{description}</Text>
    <View style={[styles.cardAction, { borderTopColor: `${accent}33` }]}><Text style={[styles.actionText, { color: accent }]}>{action}</Text><Text style={[styles.actionArrow, { color: accent }]}>→</Text></View>
  </Pressable>;
}

function ChoiceIcon({ kind, color }: { kind: Choice; color: string }) {
  return <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
    {kind === 'steps' ? <><Path d="M3 20h6v-6h6V8h6M17 3h4v5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /><Path d="m4 11 6-6m-6 0h6v6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></>
      : <><Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} /><Path d="M12 7v5l3 2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></>}
  </Svg>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(14, 28, 24, 0.58)' },
  sheet: { width: '100%', maxWidth: 540, maxHeight: '94%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 20 },
  handle: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 8 },
  content: { paddingBottom: 10, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerText: { flex: 1, gap: 6 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  title: { fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.5 },
  animation: { width: 90, height: 90 },
  intro: { fontSize: 14, lineHeight: 21, marginBottom: 2 },
  card: { borderWidth: 1, borderRadius: 20, padding: 17, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  iconBox: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  cardTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  cardDescription: { fontSize: 13, lineHeight: 19 },
  cardAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 10, marginTop: 4 },
  actionText: { fontSize: 13, fontWeight: '800' },
  actionArrow: { fontSize: 22, lineHeight: 22 },
  closeButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 14, marginTop: 2 },
  closeText: { fontSize: 15, fontWeight: '700' },
});
