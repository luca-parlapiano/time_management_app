import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { usePlanner } from '../data/PlannerProvider';
import { AppScreen, DatabaseGate } from '../ui/Primitives';
import { useAppColors } from '../ui/theme';
import { StepHabitsView } from './habits/StepHabitsView';
import { TimeHabitsView } from './habits/TimeHabitsView';
import { styles } from './habits/styles';

type HabitMode = 'steps' | 'hours';

/** Sceglie il metodo di apprendimento e delega contenuto e interazioni alle rispettive viste. */
export function HabitsScreen({ initialMode, initialHabitId }: { initialMode?: HabitMode; initialHabitId?: string }) {
  const { snapshot, statistics } = usePlanner();
  const colors = useAppColors();
  const [mode, setMode] = useState<HabitMode>(initialMode ?? 'steps');
  if (!snapshot || !statistics) return <DatabaseGate><></></DatabaseGate>;

  return <AppScreen eyebrow="Un passo alla volta" title="Abitudini" scrollable={false}>
    <View style={[styles.segment, { backgroundColor: colors.soft }]}>
      {(['steps', 'hours'] as const).map(id => <Pressable
        key={id}
        accessibilityRole="button"
        accessibilityState={{ selected: mode === id }}
        onPress={() => setMode(id)}
        style={[styles.segmentButton, { backgroundColor: mode === id ? colors.surface : colors.soft }]}
      >
        <Text style={{ color: mode === id ? colors.text : colors.muted, fontWeight: '700' }}>
          {id === 'steps' ? 'A step' : 'A ore'}
        </Text>
      </Pressable>)}
    </View>
    {mode === 'steps'
      ? <StepHabitsView archive={snapshot.archive} statistics={statistics} colors={colors}
          initialHabitId={initialMode === 'steps' ? initialHabitId : undefined} />
      : <TimeHabitsView habits={snapshot.archive.weeklyTimeHabits ?? []} statistics={statistics} colors={colors}
          initialHabitId={initialMode === 'hours' ? initialHabitId : undefined} />}
  </AppScreen>;
}
