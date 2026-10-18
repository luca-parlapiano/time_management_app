import { eventIconPaths as paths } from "../constants.js";
import type { EventIcon as IconName } from "../model/calendar.js";

interface EventIconProps { icon: IconName }

export function EventIcon({ icon }: EventIconProps) {
  const ionic = icon.startsWith('ion-');
  return <svg width="22" height="22" viewBox={ionic ? "0 0 512 512" : "0 0 24 24"} fill="none" stroke="currentColor" strokeWidth={ionic ? 32 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[icon]} /></svg>;
}
