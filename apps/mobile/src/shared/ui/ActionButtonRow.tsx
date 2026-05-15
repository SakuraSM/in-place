import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, Text, View, type ViewStyle } from 'react-native';
import { palette } from './theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
type ActionVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ActionButtonConfig {
  key: string;
  label: string;
  onPress: () => void;
  iconName?: IconName;
  variant?: ActionVariant;
  disabled?: boolean;
  loading?: boolean;
  flex?: number;
}

interface ActionButtonRowProps {
  actions: ActionButtonConfig[];
  compact?: boolean;
  style?: ViewStyle;
}

export function ActionButtonRow({ actions, compact = false, style }: ActionButtonRowProps) {
  return (
    <View style={[rowStyle, style]}>
      {actions.map((action) => (
        <ActionButton key={action.key} action={action} compact={compact} />
      ))}
    </View>
  );
}

function ActionButton({ action, compact }: { action: ActionButtonConfig; compact: boolean }) {
  const variant = action.variant ?? 'secondary';
  const textColor = variant === 'primary' || variant === 'danger' ? '#ffffff' : variant === 'ghost' ? palette.textMuted : palette.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={action.disabled || action.loading}
      onPress={action.onPress}
      style={({ pressed }) => [
        buttonStyle,
        compact ? compactButtonStyle : null,
        variantStyles[variant],
        { flex: action.flex ?? 1 },
        pressed ? pressedStyle : null,
        action.disabled || action.loading ? disabledStyle : null,
      ]}
    >
      {action.loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : action.iconName ? (
        <Ionicons name={action.iconName} size={17} color={textColor} />
      ) : null}
      <Text numberOfLines={1} style={[buttonTextStyle, { color: textColor }]}>
        {action.label}
      </Text>
    </Pressable>
  );
}

const rowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
};

const buttonStyle = {
  minHeight: 44,
  borderRadius: 14,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 6,
  paddingHorizontal: 12,
  borderWidth: 1,
};

const compactButtonStyle = {
  minHeight: 40,
  borderRadius: 12,
  paddingHorizontal: 10,
};

const variantStyles = {
  primary: {
    backgroundColor: palette.brandStrong,
    borderColor: palette.brandStrong,
  },
  secondary: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
  },
  danger: {
    backgroundColor: palette.danger,
    borderColor: palette.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: palette.borderSoft,
  },
};

const buttonTextStyle = {
  fontSize: 14,
  fontWeight: '800' as const,
};

const pressedStyle = {
  opacity: 0.76,
};

const disabledStyle = {
  opacity: 0.52,
};
