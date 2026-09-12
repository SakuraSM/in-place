import {
  semantic,
  spacing,
  borderRadius,
  fontFamilies,
  fontSizes,
  fontWeights,
  shadowsMobile,
  controlSizes,
  motionDurations,
} from '../../tokens/index';

type NamedStyles<T> = { [P in keyof T]: Record<string, unknown> };

const tokensInternal = {
  colors: semantic,
  spacing,
  borderRadius,
  fontFamilies,
  fontSizes,
  fontWeights,
  shadows: shadowsMobile,
  controlSizes,
  motionDurations,
} as const;

export const tokens = tokensInternal;

/**
 * React Native style helpers for @inplace/mobile.
 * Use `createStyles` for type-safe style objects that reference shared tokens.
 */
export function createStyles<T extends NamedStyles<T>>(styles: T | ((t: typeof tokensInternal) => T)): T {
  return typeof styles === 'function' ? styles(tokensInternal) : styles;
}

// Re-exported for direct consumption by mobile theme
export { semantic, shadowsMobile, controlSizes, motionDurations };

/**
 * Base screen style — applies canvas background.
 */
export const screenBase: Record<string, number | string> = {
  flex: 1,
  backgroundColor: tokens.colors.canvas,
};
