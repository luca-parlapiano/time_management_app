import Svg, { Path } from 'react-native-svg';
import { eventIconPaths } from '../core/constants';
import type { EventIcon as EventIconName } from '../core/model/calendar';

/** Disegna sul mobile la stessa icona usata dall'app desktop. */
export function EventIcon({ icon, color }: { icon: EventIconName; color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d={eventIconPaths[icon]} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}
