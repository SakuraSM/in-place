import type { ReactNode } from 'react';
import { Image, Text, View } from 'react-native';
import { palette, shadows } from './theme';

interface BrandHeaderProps {
  title: string;
  subtitle?: string;
  accessory?: ReactNode;
  compact?: boolean;
  variant?: 'hero' | 'page';
  align?: 'top' | 'center';
}

export function BrandHeader({
  title,
  subtitle,
  accessory,
  compact = false,
  variant,
  align = 'top',
}: BrandHeaderProps) {
  const resolvedVariant = variant ?? (compact ? 'page' : 'hero');
  const logoSize = resolvedVariant === 'hero' ? 44 : 34;
  const titleSize = resolvedVariant === 'hero' ? 30 : 24;
  const titleLineHeight = resolvedVariant === 'hero' ? 34 : 28;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: align === 'center' ? 'center' : 'flex-start', gap: 12, flex: 1 }}>
        <View
          style={{
            width: logoSize,
            height: logoSize,
            borderRadius: resolvedVariant === 'hero' ? 16 : 12,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.borderSoft,
            ...shadows.sm,
          }}
        >
          <Image
            source={require('../assets/inplace-logo-mark.png')}
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            style={{
              width: logoSize,
              height: logoSize,
            }}
          />
        </View>
        <View style={{ flex: 1, gap: resolvedVariant === 'hero' ? 3 : 1, paddingTop: resolvedVariant === 'hero' ? 1 : 0 }}>
          <Text
            style={{
              fontSize: titleSize,
              lineHeight: titleLineHeight,
              fontWeight: '800',
              color: palette.text,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                fontSize: resolvedVariant === 'hero' ? 14 : 13,
                lineHeight: resolvedVariant === 'hero' ? 19 : 18,
                color: palette.textSoft,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {accessory ? <View>{accessory as never}</View> : null}
    </View>
  );
}
