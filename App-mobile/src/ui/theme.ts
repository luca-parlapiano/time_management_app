import { Platform, useColorScheme } from 'react-native';

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

/** Usa il tema del dispositivo su iOS/Android e un tema stabile durante il rendering web. */
export function useAppColors(): AppColors {
  const scheme = useColorScheme();
  return Platform.OS !== 'web' && scheme === 'dark' ? dark : light;
}
