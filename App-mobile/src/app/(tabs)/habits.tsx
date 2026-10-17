import { useLocalSearchParams } from 'expo-router';
import { HabitsScreen } from '../../screens/HabitsScreen';

export default function HabitsRoute() {
  const params = useLocalSearchParams<{ mode?: string; habitId?: string }>();
  const initialMode = params.mode === 'hours' ? 'hours' : params.mode === 'steps' ? 'steps' : undefined;
  const initialHabitId = typeof params.habitId === 'string' ? params.habitId : undefined;
  return <HabitsScreen key={`${initialMode ?? ''}:${initialHabitId ?? ''}`} initialMode={initialMode} initialHabitId={initialHabitId} />;
}
