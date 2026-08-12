import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Entrance } from './Entrance';
import { palette, shadows } from './theme';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  delay?: number;
  density?: 'comfortable' | 'compact' | 'dense';
  tone?: 'default' | 'muted';
  headerMode?: 'default' | 'compact';
}

export function SectionCard({
  title,
  subtitle,
  children,
  delay = 0,
  density = 'comfortable',
  tone = 'default',
  headerMode = 'default',
}: SectionCardProps) {
  const padding = density === 'dense' ? 10 : density === 'compact' ? 14 : 16;
  const gap = density === 'dense' ? 8 : density === 'compact' ? 10 : 12;
  const titleSize = density === 'dense' || headerMode === 'compact'
    ? 16
    : density === 'compact' ? 18 : 20;

  return (
    <Entrance delay={delay} variant="card">
      <View
        style={{
          backgroundColor: tone === 'muted' ? palette.surfaceMuted : palette.surface,
          borderRadius: density === 'dense' ? 16 : 20,
          padding,
          gap,
          borderWidth: 1,
          borderColor: palette.borderSoft,
          ...shadows.sm,
        }}
      >
        <View style={{ gap: headerMode === 'compact' ? 2 : 4 }}>
          <Text style={{ fontSize: titleSize, fontWeight: '800', color: palette.text }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 13, lineHeight: 18, color: palette.textSoft }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children as never}
      </View>
    </Entrance>
  );
}
