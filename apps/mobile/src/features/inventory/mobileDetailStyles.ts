import { palette, shadows } from '@/shared/ui/theme';

export const bodyStyle = {
  fontSize: 15,
  lineHeight: 22,
  color: palette.textMuted,
};

export const hintStyle = {
  fontSize: 13,
  color: palette.textSoft,
};

export const rowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 12,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surface,
  padding: 12,
};

export const listTitleStyle = {
  fontSize: 16,
  fontWeight: '700' as const,
  color: palette.text,
};

export const secondaryButtonStyle = {
  minHeight: 44,
  borderRadius: 16,
  backgroundColor: palette.surface,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 16,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 6,
};

export const secondaryButtonTextStyle = {
  color: palette.text,
  fontSize: 14,
  fontWeight: '600' as const,
};

export const primaryButtonStyle = {
  flex: 1,
  minHeight: 44,
  borderRadius: 16,
  backgroundColor: palette.brand,
  paddingHorizontal: 16,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 6,
  ...shadows.sm,
};

export const primaryButtonTextStyle = {
  color: '#ffffff',
  fontSize: 14,
  fontWeight: '600' as const,
};

export const dangerButtonStyle = {
  alignItems: 'center' as const,
  borderRadius: 16,
  backgroundColor: palette.danger,
  paddingVertical: 14,
};

export const dangerButtonTextStyle = {
  color: '#ffffff',
  fontSize: 15,
  fontWeight: '700' as const,
};

export const errorTextStyle = {
  color: palette.danger,
  fontSize: 14,
  lineHeight: 20,
};

export const actionRowStyle = {
  flexDirection: 'row' as const,
  gap: 10,
};

export const heroImageCardStyle = {
  borderRadius: 24,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surface,
  padding: 8,
  ...shadows.sm,
};

export const heroImageStyle = {
  width: '100%' as const,
  aspectRatio: 1,
  borderRadius: 18,
  backgroundColor: palette.surfaceMuted,
};

export const titleCardHeaderStyle = {
  flexDirection: 'row' as const,
  alignItems: 'flex-start' as const,
  gap: 12,
};

export const detailKickerStyle = {
  fontSize: 12,
  fontWeight: '800' as const,
  color: palette.brand,
  marginBottom: 4,
};

export const detailTitleStyle = {
  fontSize: 21,
  lineHeight: 27,
  fontWeight: '900' as const,
  color: palette.text,
};

export const categoryPillStyle = {
  alignSelf: 'flex-start' as const,
  borderRadius: 999,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 10,
  paddingVertical: 5,
  fontSize: 12,
  fontWeight: '700' as const,
  color: palette.textMuted,
};

export const metricGridStyle = {
  flexDirection: 'row' as const,
  gap: 10,
};

export const metricStyle = {
  flex: 1,
  borderRadius: 16,
  backgroundColor: palette.surfaceMuted,
  padding: 12,
  gap: 4,
};

export const metricLabelStyle = {
  fontSize: 12,
  color: palette.textSoft,
};

export const metricValueStyle = {
  fontSize: 17,
  fontWeight: '900' as const,
  color: palette.text,
};

export const infoRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
};

export const infoIconStyle = {
  width: 36,
  height: 36,
  borderRadius: 12,
  backgroundColor: '#f0f9ff',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

export const infoValueStyle = {
  marginTop: 2,
  fontSize: 14,
  fontWeight: '800' as const,
  color: palette.text,
};

export const pathRailStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  flexWrap: 'wrap' as const,
  gap: 5,
};

export const pathNodeStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 3,
  maxWidth: '48%' as const,
};

export const pathTextStyle = {
  fontSize: 13,
  lineHeight: 18,
  color: palette.textMuted,
};

export const tagWrapStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 8,
};

export const tagPillStyle = {
  borderRadius: 999,
  backgroundColor: palette.brandTint,
  paddingHorizontal: 11,
  paddingVertical: 6,
  fontSize: 12,
  fontWeight: '800' as const,
  color: palette.brandStrong,
};

export const typePillStyle = {
  borderRadius: 999,
  backgroundColor: '#e0f2fe',
  paddingHorizontal: 9,
  paddingVertical: 5,
  fontSize: 12,
  fontWeight: '800' as const,
  color: palette.brand,
};
