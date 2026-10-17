import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '../ui/theme';

export default function NotFoundScreen() {
  const colors = useAppColors();
  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <Text style={[styles.title, { color: colors.text }]}>Pagina non trovata</Text>
    <Link href="/" style={[styles.link, { color: colors.accent }]}>Torna a Oggi</Link>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 15, padding: 24 },
  title: { fontSize: 22, fontWeight: '700' },
  link: { fontSize: 15, fontWeight: '700' },
});
