import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { palette } from './theme';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  accessory?: ReactNode;
  onBack?: () => void;
}

export function PageHeader({ title, subtitle, accessory, onBack = router.back }: PageHeaderProps) {
  return (
    <View style={rootStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="返回"
        hitSlop={8}
        onPress={onBack}
        style={({ pressed }) => [backButtonStyle, pressed ? pressedStyle : null]}
      >
        <Ionicons name="arrow-back" size={22} color={palette.text} />
      </Pressable>
      <View style={titleBlockStyle}>
        <Text numberOfLines={1} style={titleStyle}>{title}</Text>
        {subtitle ? <Text numberOfLines={2} style={subtitleStyle}>{subtitle}</Text> : null}
      </View>
      {accessory ? <View style={accessoryStyle}>{accessory as never}</View> : null}
    </View>
  );
}

const rootStyle = {
  minHeight: 48,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
};
const backButtonStyle = {
  width: 44,
  height: 44,
  borderRadius: 14,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surface,
};
const titleBlockStyle = { minWidth: 0, flex: 1, gap: 2 };
const titleStyle = { fontSize: 22, lineHeight: 28, fontWeight: '900' as const, color: palette.text };
const subtitleStyle = { fontSize: 13, lineHeight: 18, color: palette.textSoft };
const accessoryStyle = { minHeight: 44, justifyContent: 'center' as const };
const pressedStyle = { opacity: 0.68 };
