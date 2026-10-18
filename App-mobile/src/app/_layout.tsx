import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PlannerProvider, usePlanner } from '../data/PlannerProvider';
import { useAppColors } from '../ui/theme';
import { TimeSeriesPrompt } from '../screens/TimeSeriesPrompt';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  return <PlannerProvider><RootNavigator /></PlannerProvider>;
}

function RootNavigator() {
  const colors = useAppColors();
  const { palette } = usePlanner();
  return <>
    <StatusBar style={palette === 'night' ? 'light' : palette === 'studio' ? 'dark' : 'auto'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-choice" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
      <Stack.Screen name="new-habit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="settings" />
    </Stack>
    <TimeSeriesPrompt />
  </>;
}
