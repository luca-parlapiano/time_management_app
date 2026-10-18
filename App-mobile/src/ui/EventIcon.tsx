import Svg, { Path } from 'react-native-svg';
import { eventIconPaths } from '../core/constants';
import type { EventIcon as EventIconName } from '../core/model/calendar';

/** Disegna sul mobile la stessa icona usata dall'app desktop. */
export function EventIcon({ icon, color }: { icon: EventIconName; color: string }) {
  const ionic = icon.startsWith('ion-');
  return <Svg width={22} height={22} viewBox={ionic ? '0 0 512 512' : '0 0 24 24'} fill="none">
    <Path d={eventIconPaths[icon]} stroke={color} strokeWidth={ionic ? 32 : 1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}
