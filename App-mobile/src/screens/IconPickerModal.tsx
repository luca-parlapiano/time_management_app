import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { eventIcons } from '../core/constants';
import type { EventIcon as EventIconName } from '../core/model/calendar';
import { EventIcon } from '../ui/EventIcon';
import { useAppColors } from '../ui/theme';

const options = Object.keys(eventIcons) as EventIconName[];

function searchable(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it-IT');
}

/** Selettore ricercabile delle icone disponibili per una nuova abitudine. */
export function IconPickerModal({ visible, selected, accent, onSelect, onClose }: {
  visible: boolean;
  selected: EventIconName;
  accent: string;
  onSelect: (icon: EventIconName) => void;
  onClose: () => void;
}) {
  const colors = useAppColors();
  const [query, setQuery] = useState('');
  const matching = options.filter(icon => searchable(eventIcons[icon]).includes(searchable(query.trim())));
  const close = () => { setQuery(''); onClose(); };
  const choose = (icon: EventIconName) => { setQuery(''); onSelect(icon); };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
    <View style={styles.backdrop}>
      <Pressable accessibilityRole="button" accessibilityLabel="Chiudi scelta dell’icona" onPress={close} style={StyleSheet.absoluteFill} />
      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.header}><View style={styles.headerText}><Text style={[styles.title, { color: colors.text }]}>Scegli un’icona</Text><Text style={[styles.count, { color: colors.muted }]}>{options.length} icone disponibili</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Chiudi" onPress={close} style={styles.closeButton}><Text style={[styles.closeText, { color: colors.muted }]}>×</Text></Pressable></View>
        <TextInput accessibilityLabel="Cerca un’icona" value={query} onChangeText={setQuery} autoCapitalize="none" placeholder="Cerca un’icona" placeholderTextColor={colors.muted} style={[styles.search, { color: colors.text, backgroundColor: colors.soft, borderColor: colors.border }]} />
        <ScrollView style={styles.results} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.grid}>
          {matching.length ? matching.map(icon => {
            const checked = selected === icon;
            return <View key={icon} style={styles.cell}><Pressable accessibilityRole="radio" accessibilityLabel={eventIcons[icon]} accessibilityState={{ checked }} onPress={() => choose(icon)} style={[styles.option, { backgroundColor: checked ? accent : colors.soft, borderColor: checked ? colors.text : colors.border }]}><EventIcon icon={icon} color={checked ? '#ffffff' : colors.text} /><Text numberOfLines={1} style={[styles.optionLabel, { color: checked ? '#ffffff' : colors.text }]}>{eventIcons[icon]}</Text></Pressable></View>;
          }) : <Text style={[styles.empty, { color: colors.muted }]}>Nessuna icona trovata.</Text>}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000088' },
  panel: { width: '100%', maxWidth: 560, maxHeight: '88%', alignSelf: 'center', borderWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 28, gap: 13 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 21, fontWeight: '800' },
  count: { fontSize: 13 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 30, lineHeight: 34 },
  search: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontSize: 16 },
  results: { flexShrink: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 12 },
  cell: { width: '33.3333%', padding: 3 },
  option: { height: 76, borderWidth: 1.5, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 3 },
  optionLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  empty: { padding: 18, fontSize: 14 },
});
