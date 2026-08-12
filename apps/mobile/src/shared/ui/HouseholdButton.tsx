import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useHousehold } from '@/providers/HouseholdProvider';
import { palette } from './theme';

export function HouseholdButton({ compact = false }: { compact?: boolean }) {
  const { currentHousehold, role } = useHousehold();
  if (!currentHousehold) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`当前家庭：${currentHousehold.name}，${role === 'viewer' ? '只读' : '可编辑'}，点击切换`}
      onPress={() => router.push('/profile/household')}
      style={({ pressed }) => [buttonStyle, compact ? compactButtonStyle : null, pressed ? pressedStyle : null]}
    >
      <Ionicons name={currentHousehold.is_personal ? 'person-outline' : 'people-outline'} size={15} color={palette.brandStrong} />
      <Text numberOfLines={1} style={labelStyle}>{currentHousehold.name}</Text>
      {role === 'viewer' ? <Text style={roleStyle}>只读</Text> : null}
      <Ionicons name="chevron-down" size={13} color={palette.textSoft} />
    </Pressable>
  );
}

const buttonStyle = { minHeight: 48, maxWidth: 180, borderRadius: 15, borderWidth: 1, borderColor: palette.borderSoft, backgroundColor: palette.surface, paddingHorizontal: 11, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 };
const compactButtonStyle = { minHeight: 42, maxWidth: 150, paddingHorizontal: 9 };
const labelStyle = { maxWidth: 96, fontSize: 12, fontWeight: '800' as const, color: palette.textMuted };
const roleStyle = { fontSize: 10, fontWeight: '900' as const, color: palette.warning };
const pressedStyle = { opacity: 0.68 };
