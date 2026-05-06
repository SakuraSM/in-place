export const fontFamilies = {
  sans: [
    '-apple-system',
    'BlinkMacSystemFont',
    'PingFang SC',
    'Hiragino Sans GB',
    'Microsoft YaHei',
    'Helvetica Neue',
    'Helvetica',
    'Arial',
    'sans-serif',
  ].join(', '),
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
} as const;

export const fontSizes = {
  xs: 12,
  sm: 13,
  base: 14,
  md: 15,
  lg: 16,
  xl: 22,
  '2xl': 24,
  '3xl': 30,
} as const;

export const fontWeights = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;
