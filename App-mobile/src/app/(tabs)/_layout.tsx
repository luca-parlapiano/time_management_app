import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
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
    <Tabs.Screen name="calendar" options={{ title: 'Calendario', tabBarIcon: ({ color }) => icon('calendar', color) }} />
    <Tabs.Screen name="progress" options={{ title: 'Progressi', tabBarIcon: ({ color }) => icon('progress', color) }} />
  </Tabs>;
}
