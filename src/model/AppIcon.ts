export type AppIconName = 'sidebar-open' | 'sidebar-close' | 'add' | 'profile' | 'trash' | 'delete-event' | 'calendar' | 'statistics' | 'settings';

export interface AppIconProps {
  name: AppIconName;
  size?: number;
}
