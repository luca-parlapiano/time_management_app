import { router, Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { useAppColors } from '../../ui/theme';

type TabIcon = 'today' | 'habits' | 'calendar' | 'progress';
const symbols = {
  today: { ios: 'house.fill', android: 'home', web: 'home' },
  habits: { ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  progress: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
} as const;

function icon(name: TabIcon, color: ColorValue | null) {
  return <SymbolView name={symbols[name]} tintColor={color ?? '#267c5b'} size={23} />;
}

export default function TabLayout() {
  const colors = useAppColors();
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 62, paddingTop: 5 },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Oggi', tabBarIcon: ({ color }) => icon('today', color) }} />
    <Tabs.Screen name="habits" options={{ title: 'Abitudini', tabBarIcon: ({ color }) => icon('habits', color) }} />
    <Tabs.Screen name="create" options={{ title: 'Crea', tabBarShowLabel: false, tabBarButton: () => <Pressable accessibilityRole="button" accessibilityLabel="Crea un percorso" onPress={() => router.push('/create-choice')} style={styles.createTab}><View style={[styles.createCircle, { backgroundColor: colors.accent }]}><Text style={[styles.createPlus, { color: colors.accentText }]}>+</Text></View></Pressable> }} />
    <Tabs.Screen name="calendar" options={{ title: 'Calendario', tabBarIcon: ({ color }) => icon('calendar', color) }} />
    <Tabs.Screen name="progress" options={{ title: 'Progressi', tabBarIcon: ({ color }) => icon('progress', color) }} />
  </Tabs>;
}

const styles = StyleSheet.create({
  createTab: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -17 },
  createCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  createPlus: { fontSize: 33, fontWeight: '400', lineHeight: 38 },
});
