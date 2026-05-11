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
          borderRadius: 20,
          padding: 18,
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: palette.borderSoft,
          ...shadows.sm,
        }}
      >
        {loading ? <ActivityIndicator color={palette.brandStrong} /> : null}
        <Text style={{ fontSize: 20, fontWeight: '800', color: palette.text, textAlign: 'center' }}>{title}</Text>
        {body ? (
          <Text style={{ fontSize: 14, lineHeight: 20, color: palette.textMuted, textAlign: 'center' }}>
            {body}
          </Text>
        ) : null}
      </View>
    </Entrance>
  );
}
