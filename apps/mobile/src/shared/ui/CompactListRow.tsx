import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactElement } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { palette } from './theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface CompactListRowProps {
  title: string;
  subtitle?: string;
  caption?: string;
  meta?: string;
  icon?: ReactElement;
  iconName?: IconName;
  right?: ReactElement;
  onPress?: () => void;
  danger?: boolean;
  selected?: boolean;
  disabled?: boolean;
  chevron?: boolean;
  style?: ViewStyle;
}

export function CompactListRow({
  title,
  subtitle,
  caption,
  meta,
  icon,
  iconName,
  right,
  onPress,
  danger = false,
  selected = false,
  disabled = false,
  chevron,
  style,
}: CompactListRowProps) {
  const showChevron = chevron ?? Boolean(onPress);
  const content = (
    <View
      style={[
        rowStyle,
        selected ? selectedRowStyle : null,
        danger ? dangerRowStyle : null,
        disabled ? disabledRowStyle : null,
        style,
      ]}
    >
      {icon || iconName ? (
        <View style={[iconBoxStyle, danger ? dangerIconBoxStyle : null]}>
          {icon ?? <Ionicons name={iconName!} size={19} color={danger ? palette.danger : palette.brandStrong} />}
        </View>
      ) : null}
      <View style={textBlockStyle}>
        <View style={titleLineStyle}>
          <Text numberOfLines={1} style={[titleStyle, danger ? dangerTitleStyle : null]}>
            {title}
          </Text>
          {meta ? <Text numberOfLines={1} style={metaStyle}>{meta}</Text> : null}
        </View>
        {subtitle ? (
          <Text numberOfLines={1} ellipsizeMode="tail" style={subtitleStyle}>
            {subtitle}
          </Text>
        ) : null}
        {caption ? (
          <Text numberOfLines={1} ellipsizeMode="tail" style={captionStyle}>
            {caption}
          </Text>
        ) : null}
      </View>
      {right ?? (showChevron ? <Ionicons name="chevron-forward" size={17} color={palette.textSoft} /> : null)}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => (pressed ? pressedStyle : null)}
    >
      {content}
    </Pressable>
  );
}

const rowStyle = {
  minHeight: 54,
  width: '100%' as const,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 10,
  paddingVertical: 8,
};

const selectedRowStyle = {
  borderColor: '#bae6fd',
  backgroundColor: '#eff6ff',
};

const dangerRowStyle = {
  borderColor: '#fecdd3',
  backgroundColor: '#fff1f2',
};

const disabledRowStyle = {
  opacity: 0.55,
};

const pressedStyle = {
  opacity: 0.74,
};

const iconBoxStyle = {
  width: 34,
  height: 34,
  flexShrink: 0,
  borderRadius: 12,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: '#e0f2fe',
};

const dangerIconBoxStyle = {
  backgroundColor: '#ffe4e6',
};

const textBlockStyle = {
  flex: 1,
  minWidth: 0,
  gap: 2,
};

const titleLineStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
};

const titleStyle = {
  flex: 1,
  minWidth: 0,
  color: palette.text,
  fontSize: 15,
  fontWeight: '800' as const,
};

const dangerTitleStyle = {
  color: palette.danger,
};

const subtitleStyle = {
  color: palette.textMuted,
  fontSize: 13,
  lineHeight: 17,
};

const captionStyle = {
  color: palette.textSoft,
  fontSize: 12,
  lineHeight: 16,
};

const metaStyle = {
  flexShrink: 0,
  color: palette.textMuted,
  fontSize: 13,
  fontWeight: '700' as const,
};
