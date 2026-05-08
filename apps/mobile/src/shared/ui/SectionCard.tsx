import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Entrance } from './Entrance';
import { palette, shadows } from './theme';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  delay?: number;
  density?: 'comfortable' | 'compact';
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
  const padding = density === 'compact' ? 14 : 16;

  return (
    <Entrance delay={delay} variant="card">
      <View
        style={{
          backgroundColor: tone === 'muted' ? palette.surfaceMuted : palette.surface,
          borderRadius: 20,
          padding,
          gap: density === 'compact' ? 10 : 12,
          borderWidth: 1,
          borderColor: palette.borderSoft,
          ...shadows.sm,
        }}
      >
        <View style={{ gap: headerMode === 'compact' ? 2 : 4 }}>
          <Text style={{ fontSize: headerMode === 'compact' ? 17 : 21, fontWeight: '800', color: palette.text }}>
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
