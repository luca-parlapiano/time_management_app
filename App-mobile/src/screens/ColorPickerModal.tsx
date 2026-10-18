import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { isEventColor } from '../core/constants';
import type { EventColor } from '../core/model/calendar';
import { useAppColors } from '../ui/theme';

const palette = [
  '#C2410C', '#EA580C', '#F59E0B', '#EAB308', '#84CC16', '#65A30D',
  '#16A34A', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#2563EB',
  '#4F46E5', '#7C3AED', '#A855F7', '#D946EF', '#E11D48', '#F43F5E',
  '#92400E', '#78716C', '#475569', '#334155', '#111827', '#E2E8F0',
] as const;

/** Sceglie un segno leggibile sul campione, anche quando il colore è molto chiaro. */
export function colorCheckText(hex: string): string {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 155 ? '#172d29' : '#ffffff';
}

/** Sceglie un colore personale tra campioni visivi o tramite codice HEX. */
export function ColorPickerModal({ visible, selected, recent, onSelect, onClose }: {
  visible: boolean;
  selected: EventColor;
  recent: EventColor[];
  onSelect: (color: EventColor) => void;
  onClose: () => void;
}) {
  const colors = useAppColors();
  const [hex, setHex] = useState(selected.startsWith('#') ? selected : '');
  const validHex = /^#[0-9a-fA-F]{6}$/.test(hex);
  const choose = (value: EventColor) => { setHex(value); onSelect(value); };
  const swatches = (values: readonly string[]) => <View style={styles.grid}>{values.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`Colore ${value}`} accessibilityState={{ checked: selected.toUpperCase() === value.toUpperCase() }} onPress={() => choose(value as EventColor)} style={styles.cell}><View style={[styles.swatch, { backgroundColor: value, borderColor: selected.toUpperCase() === value.toUpperCase() ? colors.text : colors.border }]}>{selected.toUpperCase() === value.toUpperCase() && <Text style={[styles.check, { color: colorCheckText(value) }]}>✓</Text>}</View></Pressable>)}</View>;

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <Pressable accessibilityRole="button" accessibilityLabel="Chiudi scelta del colore" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.heading}><Text style={[styles.title, { color: colors.text }]}>Scegli un colore</Text><Pressable accessibilityRole="button" accessibilityLabel="Chiudi" onPress={onClose} style={styles.close}><Text style={[styles.closeText, { color: colors.muted }]}>×</Text></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {recent.length > 0 && <><Text style={[styles.sectionTitle, { color: colors.text }]}>I tuoi colori</Text>{swatches(recent)}</>}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Altri colori</Text>
          {swatches(palette)}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Un colore preciso</Text>
          <View style={styles.hexRow}><View style={[styles.hexPreview, { backgroundColor: validHex ? hex : colors.soft, borderColor: colors.border }]} /><TextInput accessibilityLabel="Codice colore HEX" value={hex} onChangeText={setHex} autoCapitalize="characters" autoCorrect={false} maxLength={7} placeholder="#A35FA8" placeholderTextColor={colors.muted} style={[styles.hexInput, { color: colors.text, backgroundColor: colors.soft, borderColor: colors.border }]} /></View>
          <Text style={[styles.hint, { color: colors.muted }]}>Inserisci # seguito da sei cifre o lettere da A a F.</Text>
          <Pressable accessibilityRole="button" disabled={!validHex} onPress={() => { if (isEventColor(hex)) choose(hex.toUpperCase() as EventColor); }} style={[styles.confirm, { backgroundColor: colors.accent, opacity: validHex ? 1 : 0.45 }]}><Text style={[styles.confirmText, { color: colors.accentText }]}>Usa questo colore</Text></Pressable>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000088' },
  panel: { width: '100%', maxWidth: 560, maxHeight: '85%', alignSelf: 'center', borderWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 26, gap: 8 },
  heading: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontSize: 21, fontWeight: '800' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 30, lineHeight: 34 },
  content: { gap: 10, paddingBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginTop: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '16.6667%', height: 56, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  check: { fontSize: 22, fontWeight: '900' },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hexPreview: { width: 46, height: 46, borderWidth: 1, borderRadius: 12 },
  hexInput: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontSize: 17, fontWeight: '700' },
  hint: { fontSize: 12 },
  confirm: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 15, fontWeight: '800' },
});
