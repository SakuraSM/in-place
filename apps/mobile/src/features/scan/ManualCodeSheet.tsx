import { useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { parseInventoryCode } from '@inplace/app-core';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { FormField } from '@/shared/ui/FormField';
import { palette } from '@/shared/ui/theme';

export function ManualCodeSheet({ visible, onClose, onSubmit }: { visible: boolean; onClose: () => void; onSubmit: (code: string) => Promise<void> }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const submit = async () => {
    if (busy.current) return;
    const code = parseInventoryCode(value);
    if (!code) { setError('请输入有效的归位标签编号或链接'); return; }
    busy.current = true;
    setSaving(true);
    setError(null);
    try { await onSubmit(code); setValue(''); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : '识别失败，输入已保留'); }
    finally { busy.current = false; setSaving(false); }
  };
  return <BottomSheet visible={visible} title="输入标签" onClose={() => { if (!busy.current) { setError(null); onClose(); } }}>
    <FormField label="标签编号或链接" value={value} onChangeText={setValue} error={error ?? undefined} placeholder="粘贴归位标签链接或编号" autoCapitalize="none" autoCorrect={false} editable={!saving} returnKeyType="go" onSubmitEditing={() => void submit()} />
    <Pressable accessibilityRole="button" disabled={saving || !value.trim()} onPress={() => void submit()} style={{ minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.brandStrong }}><Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? '识别中…' : '识别标签'}</Text></Pressable>
  </BottomSheet>;
}
