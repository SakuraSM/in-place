import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { resolveMobileDetailHref } from '@/shared/lib/detailPath';
import { getContainerTypeLabel, isLocationItem } from '@/shared/lib/location';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { palette, shadows } from '@/shared/ui/theme';
import { buildMobileItemPath, resolveInventoryImageUri } from '@/features/inventory/mobileInventoryFormat';

export function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={filterRowStyle}>
      <Text style={filterRowLabelStyle}>{label}</Text>
      <View style={filterChipsStyle}>{children as never}</View>
    </View>
  );
}

export function FilterChip({
  active,
  disabled,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[chipStyle, active ? activeChipStyle : null, disabled ? disabledChipStyle : null]}>
      {icon ? <Ionicons name={icon} size={13} color={active ? '#ffffff' : palette.textMuted} /> : null}
      <Text allowFontScaling={false} numberOfLines={1} style={active ? activeChipTextStyle : chipTextStyle}>{label}</Text>
    </Pressable>
  );
}

export function ResultRow({ item, path }: { item: Item; path: string }) {
  const imageUri = resolveInventoryImageUri(item.images[0]);
  return (
    <Pressable onPress={() => router.push(resolveMobileDetailHref(item))} style={resultRowStyle}>
      <View style={resultThumbStyle}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} resizeMode="cover" style={resultThumbImageStyle} />
        ) : (
          <Ionicons name={item.type === 'item' ? 'cube-outline' : isLocationItem(item) ? 'location-outline' : 'archive-outline'} size={22} color={palette.textSoft} />
        )}
      </View>
      <View style={resultTextStyle}>
        <View style={resultTitleLineStyle}>
          <Text numberOfLines={1} style={resultTitleStyle}>{item.name}</Text>
          {item.type === 'item' ? <StatusBadge status={item.status} /> : <Text style={containerPillStyle}>{getContainerTypeLabel(item)}</Text>}
        </View>
        {item.category ? <Text numberOfLines={1} style={resultCategoryStyle}>{item.category}</Text> : null}
        <View style={pathLineStyle}>
          <Ionicons name="home-outline" size={13} color={palette.textSoft} />
          <Ionicons name="chevron-forward" size={11} color={palette.textSoft} />
          <Text numberOfLines={1} style={pathTextStyle}>{path || '根目录'}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={palette.textSoft} />
    </Pressable>
  );
}

export function LocationFilterSheet({
  visible,
  locations,
  itemMap,
  selectedLocationId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  locations: Item[];
  itemMap: Map<string, Item>;
  selectedLocationId: string | null;
  onClose: () => void;
  onSelect: (locationId: string | null) => void;
}) {
  return (
    <BottomSheet visible={visible} title="位置树筛选" onClose={onClose}>
      <Pressable onPress={() => onSelect(null)} style={[sheetOptionStyle, !selectedLocationId ? sheetOptionActiveStyle : null]}>
        <Text style={sheetOptionTextStyle}>全部位置</Text>
        {!selectedLocationId ? <Ionicons name="checkmark" size={18} color={palette.brand} /> : null}
      </Pressable>
      {locations.map((location) => {
        const active = selectedLocationId === location.id;
        return (
          <Pressable key={location.id} onPress={() => onSelect(location.id)} style={[sheetOptionStyle, active ? sheetOptionActiveStyle : null]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={sheetOptionTextStyle}>{location.name}</Text>
              <Text numberOfLines={1} style={sheetOptionMetaStyle}>{buildMobileItemPath(location, itemMap) || '根目录'}</Text>
            </View>
            {active ? <Ionicons name="checkmark" size={18} color={palette.brand} /> : null}
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

export function TagFilterSheet({
  visible,
  tags,
  selectedTags,
  tagQuery,
  onChangeQuery,
  onClear,
  onClose,
  onToggleTag,
}: {
  visible: boolean;
  tags: { name: string; count: number }[];
  selectedTags: string[];
  tagQuery: string;
  onChangeQuery: (query: string) => void;
  onClear: () => void;
  onClose: () => void;
  onToggleTag: (tag: string) => void;
}) {
  return (
    <BottomSheet visible={visible} title="标签筛选" onClose={onClose}>
      <View style={sheetSearchStyle}>
        <Ionicons name="search-outline" size={17} color={palette.textSoft} />
        <TextInput value={tagQuery} onChangeText={onChangeQuery} placeholder="搜索标签" style={sheetSearchInputStyle} />
      </View>
      <Pressable onPress={onClear} style={[sheetOptionStyle, selectedTags.length === 0 ? sheetOptionActiveStyle : null]}>
        <Text style={sheetOptionTextStyle}>全部标签</Text>
        <Text style={sheetOptionCountStyle}>{tags.length}</Text>
      </Pressable>
      {tags.length === 0 ? <Text style={emptySheetTextStyle}>没有匹配的标签</Text> : null}
      {tags.map((tag) => {
        const active = selectedTags.includes(tag.name);
        return (
          <Pressable key={tag.name} onPress={() => onToggleTag(tag.name)} style={[sheetOptionStyle, active ? sheetOptionActiveStyle : null]}>
            <Text numberOfLines={1} style={sheetOptionTextStyle}>{tag.name}</Text>
            <Text style={sheetOptionCountStyle}>{tag.count}</Text>
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

function BottomSheet({ visible, title, children, onClose }: { visible: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={sheetRootStyle}>
        <Pressable style={sheetBackdropStyle} onPress={onClose} />
        <View style={sheetStyle}>
          <View style={sheetHandleStyle} />
          <View style={sheetHeaderStyle}>
            <Text style={sheetTitleStyle}>{title}</Text>
            <Pressable onPress={onClose} style={sheetCloseStyle}>
              <Ionicons name="close" size={18} color={palette.textMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={sheetContentStyle}>{children as never}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export const screenContentStyle = { paddingHorizontal: 18, gap: 10 };
export const pageTitleStyle = { fontSize: 28, lineHeight: 34, fontWeight: '900' as const, color: palette.text, paddingTop: 2 };
export const searchBoxStyle = {
  minHeight: 50,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surface,
  paddingHorizontal: 14,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
  ...shadows.sm,
};
export const searchInputStyle = { flex: 1, minHeight: 44, fontSize: 15, color: palette.text };
export const clearButtonStyle = {
  width: 28,
  height: 28,
  borderRadius: 999,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: palette.surfaceMuted,
};
export const filterPanelStyle = { gap: 7, paddingTop: 2 };
export const resultDividerStyle = { height: 1, marginHorizontal: -18, backgroundColor: palette.borderSoft };
export const resultSummaryStyle = { fontSize: 16, color: palette.textSoft, paddingTop: 8 };
export const resultListStyle = { gap: 12 };
export const loadedMetaStyle = { textAlign: 'center' as const, fontSize: 13, color: palette.textSoft };
export const loadingMoreStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 8,
  paddingBottom: 8,
};

const filterRowStyle = { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8 };
const filterRowLabelStyle = { width: 32, paddingTop: 7, fontSize: 12, fontWeight: '800' as const, color: palette.textSoft };
const filterChipsStyle = { flex: 1, flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 };
const chipStyle = {
  minHeight: 30,
  maxWidth: '100%' as const,
  borderRadius: 999,
  backgroundColor: '#eef2f7',
  paddingHorizontal: 9,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 4,
};
const activeChipStyle = { backgroundColor: palette.brand };
const disabledChipStyle = { opacity: 0.42 };
const chipTextStyle = { fontSize: 12, fontWeight: '800' as const, color: palette.textMuted };
const activeChipTextStyle = { fontSize: 12, fontWeight: '900' as const, color: '#ffffff' };
const resultRowStyle = {
  minHeight: 88,
  borderRadius: 22,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surface,
  padding: 14,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 12,
  ...shadows.sm,
};
const resultThumbStyle = {
  width: 58,
  height: 58,
  borderRadius: 16,
  backgroundColor: palette.surfaceMuted,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  overflow: 'hidden' as const,
};
const resultThumbImageStyle = { width: '100%' as const, height: '100%' as const };
const resultTextStyle = { flex: 1, minWidth: 0, gap: 4 };
const resultTitleLineStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 };
const resultTitleStyle = { flex: 1, fontSize: 16, fontWeight: '900' as const, color: palette.text };
const resultCategoryStyle = { fontSize: 13, color: palette.textMuted };
const pathLineStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 };
const pathTextStyle = { flex: 1, fontSize: 13, color: palette.textSoft };
const containerPillStyle = {
  borderRadius: 9,
  backgroundColor: palette.brandTint,
  paddingHorizontal: 8,
  paddingVertical: 3,
  fontSize: 11,
  fontWeight: '800' as const,
  color: palette.brandStrong,
};
const sheetRootStyle = { flex: 1, justifyContent: 'flex-end' as const };
const sheetBackdropStyle = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.28)',
};
const sheetStyle = {
  maxHeight: '76%' as const,
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  backgroundColor: palette.surface,
  overflow: 'hidden' as const,
};
const sheetHandleStyle = { alignSelf: 'center' as const, width: 42, height: 4, borderRadius: 999, backgroundColor: palette.border, marginTop: 10 };
const sheetHeaderStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  paddingHorizontal: 18,
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: palette.borderSoft,
};
const sheetTitleStyle = { fontSize: 18, fontWeight: '900' as const, color: palette.text };
const sheetCloseStyle = {
  width: 34,
  height: 34,
  borderRadius: 999,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: palette.surfaceMuted,
};
const sheetContentStyle = { padding: 16, gap: 10 };
const sheetOptionStyle = {
  minHeight: 54,
  borderRadius: 16,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 14,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  gap: 10,
};
const sheetOptionActiveStyle = { backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd' };
const sheetOptionTextStyle = { flex: 1, fontSize: 15, fontWeight: '800' as const, color: palette.text };
const sheetOptionMetaStyle = { marginTop: 2, fontSize: 12, color: palette.textSoft };
const sheetOptionCountStyle = {
  borderRadius: 999,
  backgroundColor: '#e2e8f0',
  paddingHorizontal: 8,
  paddingVertical: 3,
  fontSize: 12,
  fontWeight: '800' as const,
  color: palette.textMuted,
};
const sheetSearchStyle = {
  minHeight: 48,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
};
const sheetSearchInputStyle = { flex: 1, minHeight: 46, fontSize: 14, color: palette.text };
const emptySheetTextStyle = { paddingVertical: 24, textAlign: 'center' as const, color: palette.textSoft };
