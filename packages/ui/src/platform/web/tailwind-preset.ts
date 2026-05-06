import {
  colors,
  semantic,
  spacing,
  borderRadius,
  fontFamilies,
  fontSizes,
  fontWeights,
  shadowsWeb,
} from '../../tokens/index';

/**
 * Tailwind preset for @inplace/web.
 * Usage: `export default { presets: [require('@inplace/ui/tailwind-preset')] }`
 * Or in JS: `import { tailwindPreset } from '@inplace/ui/tailwind-preset'`
 */
export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(
          Object.entries(colors).map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              return [key, value];
            }
            return [key, value];
          }),
        ),
        // Semantic aliases
        canvas: semantic.canvas,
        canvasStrong: semantic.canvasStrong,
        surface: semantic.surface,
        surfaceMuted: semantic.surfaceMuted,
        border: semantic.border,
        borderSoft: semantic.borderSoft,
        brand: semantic.brand,
        brandStrong: semantic.brandStrong,
        brandTint: semantic.brandTint,
      },
      spacing: Object.fromEntries(
        Object.entries(spacing).map(([k, v]) => [k, `${v}px`]),
      ),
      borderRadius: Object.fromEntries(
        Object.entries(borderRadius).map(([k, v]) => [k, `${v}px`]),
      ),
      fontFamily: {
        sans: fontFamilies.sans,
        mono: fontFamilies.mono,
      },
      fontSize: Object.fromEntries(
        Object.entries(fontSizes).map(([k, v]) => [k, `${v}px`]),
      ),
      fontWeight: fontWeights,
      boxShadow: shadowsWeb,
    },
  },
};
