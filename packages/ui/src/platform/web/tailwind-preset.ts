import {
  colors,
  semantic,
  spacing,
  borderRadius,
  fontFamilies,
  fontSizes,
  fontWeights,
  shadowsWeb,
  controlSizes,
  motionDurations,
  layout,
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
        brandHover: semantic.brandHover,
        ink: semantic.text,
        muted: semantic.textMuted,
        danger: semantic.danger,
        dangerTint: semantic.dangerTint,
        success: semantic.success,
        successTint: semantic.successTint,
        warning: semantic.warning,
        warningTint: semantic.warningTint,
        info: semantic.info,
        infoTint: semantic.infoTint,
        disabledText: semantic.disabledText,
        disabledSurface: semantic.disabledSurface,
        focusRing: semantic.focusRing,
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
      height: { 'map-mobile': `${layout.mapCanvas.mobile}px`, 'map-desktop': `${layout.mapCanvas.desktop}px` },
      minHeight: {
        ...Object.fromEntries(Object.entries(controlSizes).map(([key, value]) => [`control-${key}`, `${value}px`])),
        'map-mobile': `${layout.mapCanvas.mobile}px`,
        'map-desktop': `${layout.mapCanvas.desktop}px`,
      },
      transitionDuration: Object.fromEntries(
        Object.entries(motionDurations).map(([key, value]) => [`motion-${key}`, `${value}ms`]),
      ),
    },
  },
};
