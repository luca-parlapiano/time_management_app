import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PlannerProvider } from '../data/PlannerProvider';
import { useAppColors } from '../ui/theme';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const colors = useAppColors();
  return <PlannerProvider>
    <StatusBar style="auto" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-choice" options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }} />
      <Stack.Screen name="new-habit" options={{ presentation: 'modal' }} />
    </Stack>
  </PlannerProvider>;
}
