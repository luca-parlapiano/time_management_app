// Generato da scripts/sync-core.mjs: modificare il sorgente in App-desktop.
import type { EventColor, EventIcon } from './calendar';

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
