import { Platform, type ViewStyle } from 'react-native';
import { semantic, shadowsMobile } from '@inplace/ui/mobile';

type ShadowName = keyof typeof shadowsMobile;

export const palette = semantic;

function stabilizeAndroidElevation(shadowStyle: ViewStyle): ViewStyle {
  if (Platform.OS !== 'android') {
    return shadowStyle;
  }

  return {
    ...shadowStyle,
    elevation: 0,
  };
}

export const shadows: Record<ShadowName, ViewStyle> = {
  sm: stabilizeAndroidElevation(shadowsMobile.sm),
  md: stabilizeAndroidElevation(shadowsMobile.md),
  lg: stabilizeAndroidElevation(shadowsMobile.lg),
  card: stabilizeAndroidElevation(shadowsMobile.card),
  logo: stabilizeAndroidElevation(shadowsMobile.logo),
};
