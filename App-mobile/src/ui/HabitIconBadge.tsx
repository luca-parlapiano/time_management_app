import { StyleSheet, View } from 'react-native';
import { eventColorValue } from '../core/constants';
import type { EventColor, EventIcon as EventIconName } from '../core/model/calendar';
import { EventIcon } from './EventIcon';

/** Rende riconoscibile un'abitudine con l'icona e il colore scelti alla creazione. */
export function HabitIconBadge({ icon, color, backgroundColor }: { icon: EventIconName; color: EventColor; backgroundColor: string }) {
  const accent = eventColorValue(color);
  return <View style={[styles.badge, { backgroundColor, borderColor: accent }]}>
    <EventIcon icon={icon} color={accent} />
  </View>;
}

const styles = StyleSheet.create({
  badge: { width: 42, height: 42, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
