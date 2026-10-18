import { Platform, useColorScheme } from 'react-native';
import { usePlanner } from '../data/PlannerProvider';

export interface AppColors {
  background: string;
  surface: string;
  soft: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentText: string;
  danger: string;
}

const light: AppColors = {
  background: '#fbfaf4', surface: '#ffffff', soft: '#e7f5e9', text: '#1d342c',
  muted: '#5e7067', border: '#dfe8dd', accent: '#267c5b', accentText: '#ffffff', danger: '#a24438',
};
const dark: AppColors = {
  background: '#18231f', surface: '#23312b', soft: '#284237', text: '#f0f4ed',
  muted: '#a8bbb0', border: '#3b5044', accent: '#80c8a2', accentText: '#12261b', danger: '#efaaa0',
};
const studio: AppColors = {
  background: '#f5f7fa', surface: '#ffffff', soft: '#edf2fa', text: '#202938',
  muted: '#53637a', border: '#dbe3ef', accent: '#365edc', accentText: '#ffffff', danger: '#88432d',
};
const night: AppColors = {
  background: '#171c24', surface: '#272f3c', soft: '#293547', text: '#e8edf5',
  muted: '#b3bfce', border: '#465164', accent: '#b6a4ee', accentText: '#1b212c', danger: '#f3bdab',
};

/** Usa il tema del dispositivo su iOS/Android e un tema stabile durante il rendering web. */
export function useAppColors(): AppColors {
  const scheme = useColorScheme();
  const { palette } = usePlanner();
  if (palette === 'studio') return studio;
  if (palette === 'night') return night;
  return Platform.OS !== 'web' && scheme === 'dark' ? dark : light;
}
