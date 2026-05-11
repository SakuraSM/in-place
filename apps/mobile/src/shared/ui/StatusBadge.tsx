import { Text, View } from 'react-native';
import { ITEM_STATUS_PRESENTATION, type PresentationTone } from '@inplace/app-core';
import type { ItemStatus } from '@inplace/domain';
import { palette } from './theme';

interface StatusToneStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  dotColor: string;
}

const STATUS_TONE_STYLES: Record<PresentationTone, StatusToneStyle> = {
  success: {
    backgroundColor: palette.successTint,
    borderColor: '#d1fae5',
    textColor: '#047857',
    dotColor: palette.success,
  },
  warning: {
    backgroundColor: palette.warningTint,
    borderColor: '#fef3c7',
    textColor: '#b45309',
    dotColor: palette.warning,
  },
  danger: {
    backgroundColor: palette.dangerTint,
    borderColor: '#fee2e2',
    textColor: palette.danger,
    dotColor: '#f87171',
  },
  neutral: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.borderSoft,
    textColor: palette.textMuted,
    dotColor: palette.textSoft,
  },
  brand: {
    backgroundColor: palette.brandTint,
    borderColor: '#bae6fd',
    textColor: palette.brandStrong,
    dotColor: palette.brand,
  },
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  const presentation = ITEM_STATUS_PRESENTATION[status];
  const toneStyle = STATUS_TONE_STYLES[presentation.tone];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`状态：${presentation.label}`}
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: toneStyle.borderColor,
        backgroundColor: toneStyle.backgroundColor,
        paddingHorizontal: 9,
        paddingVertical: 4,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          backgroundColor: toneStyle.dotColor,
        }}
      />
      <Text
        style={{
          color: toneStyle.textColor,
          fontSize: 12,
          fontWeight: '700',
        }}
      >
        {presentation.label}
      </Text>
    </View>
  );
}
