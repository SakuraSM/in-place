// Design system color palette — canonical source of truth for Web and Mobile.

export const colors = {
  // Neutrals
  slate: {
    50: '#f7f9f6',
    100: '#f0f5f1',
    200: '#dbe4dd',
    300: '#bdcbc1',
    400: '#82988b',
    500: '#61736a',
    600: '#52675b',
    700: '#3c5548',
    800: '#2e483a',
    900: '#243b33',
    950: '#1d3028',
  },

  // Brand
  sky: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
  },

  // Status
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    500: '#10b981',
    600: '#059669',
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
  },

  // Surface
  white: '#ffffff',
  black: '#000000',
} as const;

// Semantic aliases — use these in component code for clarity
export const semantic = {
  canvas: '#f7f9f6',
  canvasStrong: '#eaf1e8',
  surface: colors.white,
  surfaceMuted: '#f0f5f1',
  border: '#dbe4dd',
  borderSoft: '#e5ece6',
  text: '#243b33',
  textMuted: '#61736a',
  textSoft: '#61736a',
  disabledText: '#6c796f',
  disabledSurface: '#edf0ed',
  brand: '#22735b',
  brandStrong: '#22735b',
  brandHover: '#195941',
  brandTint: '#e6f2e9',
  focusRing: '#22735b',
  overlay: 'rgba(15, 23, 42, 0.48)',
  danger: '#ad403c',
  dangerTint: '#fbece9',
  success: '#22735b',
  successTint: '#e6f2e9',
  warning: '#946019',
  warningTint: '#fbf2df',
  info: '#37677d',
  infoTint: '#eaf3f7',
} as const;
