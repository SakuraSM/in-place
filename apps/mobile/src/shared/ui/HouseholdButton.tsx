import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useHousehold } from '@/providers/HouseholdProvider';
import { BottomSheet } from './BottomSheet';
import { useNotify } from './ToastProvider';
import { palette } from './theme';

export function HouseholdButton({ compact = false }: { compact?: boolean }) {
  const { currentHousehold, role, households, switchHousehold } = useHousehold();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const busyRef = useRef(false);
  const notify = useNotify();
  const select = async (id: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setSwitching(true);
    try { await switchHousehold(id); setOpen(false); }
    catch (error) { notify({ tone: 'error', title: '切换失败', description: error instanceof Error ? error.message : '请重试' }); }
    finally { busyRef.current = false; setSwitching(false); }
  };
  if (!currentHousehold) return null;
  return (
    <><Pressable
      accessibilityRole="button"
      accessibilityLabel={`当前家庭：${currentHousehold.name}，${role === 'viewer' ? '只读' : '可编辑'}，点击切换`}
      onPress={() => setOpen(true)}
      style={({ pressed }) => [buttonStyle, compact ? compactButtonStyle : null, pressed ? pressedStyle : null]}
    >
      <Ionicons name={currentHousehold.is_personal ? 'person-outline' : 'people-outline'} size={15} color={palette.brandStrong} />
      <Text numberOfLines={1} style={labelStyle}>{currentHousehold.name}</Text>
      {role === 'viewer' ? <Text style={roleStyle}>只读</Text> : null}
      <Ionicons name="chevron-down" size={13} color={palette.textSoft} />
    </Pressable>
    <BottomSheet title="切换家庭" visible={open} onClose={() => { if (!switching) setOpen(false); }}>
      {households.map((household) => <Pressable key={household.id} accessibilityRole="button" accessibilityLabel={`切换到${household.name}`} accessibilityState={{ selected: household.id === currentHousehold.id, disabled: switching }} disabled={switching} onPress={() => void select(household.id)} style={[buttonStyle, { maxWidth: '100%', minHeight: 60 }]}>
        <View style={{ flex: 1, paddingVertical: 8, gap: 4 }}><Text style={[labelStyle, { maxWidth: '100%' }]}>{household.name}</Text><Text style={{ fontSize: 12, color: palette.textSoft }}>{household.is_personal ? '个人空间' : '共享空间'} · {household.role === 'viewer' ? '只读' : household.role === 'owner' ? '所有者' : '可编辑'}</Text></View>
        {household.id === currentHousehold.id ? <Ionicons name="checkmark" size={20} color={palette.brandStrong} /> : null}
      </Pressable>)}
      <Pressable accessibilityRole="button" disabled={switching} onPress={() => { setOpen(false); router.push('/profile/household'); }} style={[buttonStyle, { maxWidth: '100%', justifyContent: 'center' }]}><Text style={labelStyle}>管理家庭与成员</Text></Pressable>
    </BottomSheet></>
  );
}

const buttonStyle = { minHeight: 48, maxWidth: 180, borderRadius: 15, borderWidth: 1, borderColor: palette.borderSoft, backgroundColor: palette.surface, paddingHorizontal: 11, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 };
const compactButtonStyle = { minHeight: 48, maxWidth: 150, paddingHorizontal: 9 };
const labelStyle = { maxWidth: 96, fontSize: 12, fontWeight: '800' as const, color: palette.textMuted };
const roleStyle = { fontSize: 10, fontWeight: '900' as const, color: palette.warning };
const pressedStyle = { opacity: 0.68 };
