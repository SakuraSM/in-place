// Design system color palette — canonical source of truth for Web and Mobile.
// Hex values correspond to Tailwind default palette for consistency.

export const colors = {
  // Neutrals
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
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
  canvas: colors.slate[50],
  canvasStrong: colors.slate[100],
  surface: colors.white,
  surfaceMuted: colors.slate[50],
  border: '#dbe4ee',
  borderSoft: colors.slate[100],
  text: colors.slate[900],
  textMuted: colors.slate[600],
  textSoft: colors.slate[500],
  brand: colors.sky[500],
  brandStrong: colors.sky[600],
  brandTint: colors.sky[100],
  danger: colors.red[600],
  dangerTint: colors.red[100],
  success: colors.emerald[500],
  successTint: colors.emerald[50],
  warning: colors.amber[500],
  warningTint: colors.amber[50],
} as const;
