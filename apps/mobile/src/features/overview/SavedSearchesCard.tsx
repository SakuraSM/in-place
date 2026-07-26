import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { InventoryFilterState } from '@inplace/app-core';
import {
  deleteOverviewSearch,
  loadSavedOverviewSearches,
  saveOverviewSearch,
  type SavedOverviewSearch,
} from './savedOverviewSearches';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { palette } from '@/shared/ui/theme';
import { useNotify } from '@/shared/ui/ToastProvider';

interface SavedSearchesCardProps {
  filters: InventoryFilterState;
  onApply: (filters: InventoryFilterState) => void;
}

export function SavedSearchesCard({ filters, onApply }: SavedSearchesCardProps) {
  const notify = useNotify();
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [searches, setSearches] = useState<SavedOverviewSearch[]>([]);

  const handleOpen = async () => {
    setSearches(await loadSavedOverviewSearches());
    setVisible(true);
  };

  const handleSave = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      notify({ tone: 'error', title: '请输入筛选名称' });
      return;
    }
    setSearches(await saveOverviewSearch(normalizedName, filters));
    setName('');
    notify({ tone: 'success', title: '筛选已保存' });
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => void handleOpen()}
        style={triggerStyle}
      >
        <Ionicons name="bookmark-outline" size={17} color={palette.brandStrong} />
        <Text style={triggerTextStyle}>已保存筛选</Text>
      </Pressable>
      <BottomSheet visible={visible} title="已保存筛选" onClose={() => setVisible(false)}>
        <View style={saveRowStyle}>
          <TextInput
            accessibilityLabel="筛选名称"
            value={name}
            onChangeText={setName}
            placeholder="例如：需要补货"
            style={inputStyle}
          />
          <Pressable accessibilityRole="button" onPress={() => void handleSave()} style={saveButtonStyle}>
            <Text style={saveButtonTextStyle}>保存当前</Text>
          </Pressable>
        </View>
        {searches.length === 0 ? (
          <Text style={emptyStyle}>还没有保存筛选，最多可保存 10 组。</Text>
        ) : null}
        {searches.map((search) => (
          <View key={search.id} style={rowStyle}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onApply(search.filters);
                setVisible(false);
              }}
              style={rowMainStyle}
            >
              <Text style={rowTitleStyle}>{search.name}</Text>
              <Text style={rowMetaStyle}>
                {search.filters.q || '全部库存'} · {search.filters.view === 'flat' ? '平铺' : '层级'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`删除筛选${search.name}`}
              hitSlop={8}
              onPress={() => void deleteOverviewSearch(search.id).then(setSearches)}
            >
              <Ionicons name="trash-outline" size={18} color={palette.danger} />
            </Pressable>
          </View>
        ))}
      </BottomSheet>
    </>
  );
}

const triggerStyle = {
  alignSelf: 'flex-start' as const,
  minHeight: 36,
  borderRadius: 12,
  backgroundColor: palette.brandTint,
  paddingHorizontal: 11,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
};
const triggerTextStyle = { fontSize: 13, fontWeight: '800' as const, color: palette.brandStrong };
const saveRowStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 };
const inputStyle = {
  flex: 1,
  minHeight: 44,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 12,
  color: palette.text,
};
const saveButtonStyle = {
  minHeight: 44,
  borderRadius: 14,
  backgroundColor: palette.brand,
  paddingHorizontal: 13,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
const saveButtonTextStyle = { fontSize: 13, fontWeight: '800' as const, color: '#ffffff' };
const emptyStyle = { fontSize: 14, lineHeight: 20, color: palette.textSoft };
const rowStyle = {
  minHeight: 58,
  borderTopWidth: 1,
  borderTopColor: palette.borderSoft,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 12,
};
const rowMainStyle = { flex: 1, gap: 3, paddingVertical: 10 };
const rowTitleStyle = { fontSize: 15, fontWeight: '800' as const, color: palette.text };
const rowMetaStyle = { fontSize: 12, color: palette.textSoft };
