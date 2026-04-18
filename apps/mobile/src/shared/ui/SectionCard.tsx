import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Entrance } from './Entrance';
import { palette, shadows } from './theme';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  delay?: number;
}

export function SectionCard({ title, subtitle, children, delay = 0 }: SectionCardProps) {
  return (
    <Entrance delay={delay}>
      <View
        style={{
          backgroundColor: palette.surface,
          borderRadius: 24,
          padding: 20,
          gap: 14,
          borderWidth: 1,
          borderColor: palette.borderSoft,
          ...shadows.card,
        }}
      >
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: palette.text }}>{title}</Text>
          {subtitle ? <Text style={{ fontSize: 14, lineHeight: 20, color: palette.textSoft }}>{subtitle}</Text> : null}
        </View>
        {children as never}
      </View>
    </Entrance>
  );
}
