import { eventIconPaths as paths } from "../constants.js";
import type { EventIcon as IconName } from "../model/calendar.js";

interface EventIconProps { icon: IconName }

export function EventIcon({ icon }: EventIconProps) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[icon]} /></svg>;
}
