import { Pressable, Text, View } from 'react-native';
import { palettes } from '../../core/constants';
import type { Palette } from '../../core/model/theme';
import { Surface } from '../../ui/Primitives';
import type { AppColors } from '../../ui/theme';
import { styles } from './styles';

/** Selezione della palette locale del dispositivo. */
export function PaletteSection({ palette, onChange, unavailable, colors }: {
  palette: Palette;
  onChange: (value: Palette) => void;
  unavailable: boolean;
  colors: AppColors;
}) {
  return <Surface colors={colors}>
    <Text style={[styles.heading, { color: colors.text }]}>Palette dell’app</Text>
    {palettes.map(option => <Pressable
      key={option.id}
      accessibilityRole="radio"
      accessibilityState={{ checked: palette === option.id }}
      disabled={unavailable}
      onPress={() => onChange(option.id as Palette)}
      style={[styles.paletteRow, {
        borderColor: palette === option.id ? colors.accent : colors.border,
        backgroundColor: palette === option.id ? colors.soft : colors.surface,
      }]}
    >
      <View style={[styles.swatch, { backgroundColor: option.id === 'natural' ? '#267c5b' : option.id === 'studio' ? '#365edc' : '#b6a4ee' }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: colors.text }]}>{option.label}</Text>
        <Text style={[styles.copy, { color: colors.muted }]}>{option.description}</Text>
      </View>
      <Text style={{ color: colors.accent, fontSize: 22 }}>{palette === option.id ? '✓' : ''}</Text>
    </Pressable>)}
    <Text style={[styles.copy, { color: colors.muted }]}>La scelta viene salvata su questo dispositivo.</Text>
  </Surface>;
}
