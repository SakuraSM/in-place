import { ActivityIndicator, Text, View } from 'react-native';
import { Entrance } from './Entrance';
import { palette, shadows } from './theme';

interface StateBlockProps {
  title: string;
  body?: string;
  loading?: boolean;
}

export function StateBlock({ title, body, loading = false }: StateBlockProps) {
  return (
    <Entrance>
      <View
        style={{
          backgroundColor: palette.surface,
          borderRadius: 24,
          padding: 24,
          gap: 10,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: palette.borderSoft,
          ...shadows.card,
        }}
      >
        {loading ? <ActivityIndicator color={palette.brandStrong} /> : null}
        <Text style={{ fontSize: 22, fontWeight: '800', color: palette.text }}>{title}</Text>
        {body ? (
          <Text style={{ fontSize: 15, lineHeight: 22, color: palette.textMuted, textAlign: 'center' }}>
            {body}
          </Text>
        ) : null}
      </View>
    </Entrance>
  );
}
