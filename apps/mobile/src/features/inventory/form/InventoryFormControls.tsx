import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { controlSizes } from '@inplace/ui/mobile';
import { isInventoryDate } from '@inplace/app-core';
import { FormField } from '@/shared/ui/FormField';
import { palette } from '@/shared/ui/theme';

export function FormChoice({ label, selected, disabled, onPress }: {
  label: string; selected: boolean; disabled: boolean; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ minHeight: controlSizes.touch, borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: selected ? palette.brandStrong : palette.border, backgroundColor: selected ? palette.brandTint : palette.surface, opacity: pressed ? 0.7 : 1 })}>
    <Text style={{ color: selected ? palette.brandStrong : palette.textMuted, fontWeight: selected ? '800' : '600', fontSize: 14 }}>{label}</Text>
  </Pressable>;
}

export function InventoryDateInput({ label, value, error, disabled, onChange }: {
  label: string; value: string; error?: string; disabled: boolean; onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return <View style={{ gap: 6 }}>
    <FormField label={label} value={value} error={error} editable={!disabled} placeholder="YYYY-MM-DD" onChangeText={onChange} autoCapitalize="none"
      trailing={<Pressable accessibilityRole="button" accessibilityLabel={`选择${label}`} disabled={disabled} onPress={() => setOpen(true)} style={{ minWidth: controlSizes.touch, minHeight: controlSizes.touch, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="calendar-outline" color={palette.brandStrong} size={20} />
      </Pressable>} />
    {open ? <DateTimePicker mode="date" value={isInventoryDate(value) ? new Date(`${value}T12:00:00`) : new Date()} onChange={(event, date) => {
      if (Platform.OS === 'android') setOpen(false);
      if (event.type === 'dismissed' || !date) return;
      onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
    }} /> : null}
  </View>;
}
