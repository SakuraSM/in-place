import type { ReactNode } from 'react';
import { Image, Text, View } from 'react-native';
import { palette, shadows } from './theme';

interface BrandHeaderProps {
  title: string;
  subtitle?: string;
  accessory?: ReactNode;
  compact?: boolean;
}

export function BrandHeader({ title, subtitle, accessory, compact = false }: BrandHeaderProps) {
  const logoSize = compact ? 52 : 64;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 12 : 14, flex: 1 }}>
        <View
          style={{
            width: logoSize,
            height: logoSize,
            borderRadius: compact ? 18 : 22,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            ...shadows.card,
          }}
        >
          <Image
            source={require('../assets/inplace-logo-mark.png')}
            accessibilityIgnoresInvertColors
            style={{
              width: logoSize,
              height: logoSize,
            }}
          />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: compact ? 24 : 30, fontWeight: '800', color: palette.text }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: compact ? 13 : 15, lineHeight: compact ? 18 : 22, color: palette.textSoft }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {accessory ? <View>{accessory as never}</View> : null}
    </View>
  );
}
