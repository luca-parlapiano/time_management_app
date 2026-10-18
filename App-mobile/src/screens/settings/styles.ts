import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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
