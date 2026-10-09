export type AppIconName = 'sidebar-open' | 'sidebar-close' | 'add' | 'profile' | 'trash' | 'delete-event' | 'today' | 'habits' | 'calendar' | 'statistics' | 'trophies' | 'settings' | 'dev';

interface AppIconProps {
  name: AppIconName;
  size?: number;
}

/** Icone decorative dell’interfaccia; il nome accessibile resta sul pulsante. */
export function AppIcon({ name, size = 22 }: AppIconProps) {
  const shapes = {
    'sidebar-open': <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16M13 9l3 3-3 3" /></>,
    'sidebar-close': <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16M16 9l-3 3 3 3" /></>,
    add: <path d="M12 5v14M5 12h14" />,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
    trash: <path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7m4-7v7" />,
    'delete-event': <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />,
    today: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    habits: <><path d="M12 21C7 18 4 14 4 10a4 4 0 0 1 7-3 4 4 0 0 1 7 3c0 4-3 8-6 11Z" /><path d="M12 7c0-2 1-4 3-5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2" /></>,
    statistics: <path d="M4 20V10h4v10m2 0V4h4v16m2 0v-7h4v7M2 20h20" />,
    trophies: <><path d="M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v5m-4 3h8m-6-3h4v3" /></>,
    settings: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" fill="rgb(var(--surface-rgb))" /><circle cx="15" cy="17" r="3" fill="rgb(var(--surface-rgb))" /></>,
    dev: <path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'add' ? 2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>;
}
