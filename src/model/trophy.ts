import type { EventColor, EventIcon } from './calendar.js';

export interface Trophy {
  id: string;
  kind: 'steps' | 'time';
  title: string;
  icon: EventIcon;
  color: EventColor;
  earnedOn?: string;
  concluded: boolean;
  achieved: number;
  target: number;
}
