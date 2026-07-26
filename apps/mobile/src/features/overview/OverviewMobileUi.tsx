import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { itemsApi } from '@/shared/api/mobileClient';
import { resolveMobileContainerBrowseHref, resolveMobileDetailHref } from '@/shared/lib/detailPath';
import { getContainerTypeLabel, isLocationItem } from '@/shared/lib/location';
import { InventoryIcon } from '@/shared/ui/InventoryIcon';
import { LocationHierarchyPicker } from '@/features/home/LocationHierarchyPicker';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { palette, shadows } from '@/shared/ui/theme';
import { formatMobileLocationPath, resolveInventoryImageUri } from '@/features/inventory/mobileInventoryFormat';
import { InventoryImage } from '@/features/inventory/InventoryImage';

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

interface ResultRowProps {
  item: Item;
  path: string;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelected?: (itemId: string) => void;
}

export function ResultRow({ item, path, selectionMode = false, selected = false, onToggleSelected }: ResultRowProps) {
  const imageUri = resolveInventoryImageUri(item.images[0]);
  const handlePress = () => {
    if (selectionMode) {
      onToggleSelected?.(item.id);
      return;
    }

    router.push(item.type === 'container' ? resolveMobileContainerBrowseHref(item) : resolveMobileDetailHref(item));
  };

  const handleLongPress = () => {
    if (!selectionMode && item.type === 'container') {
      router.push(resolveMobileDetailHref(item));
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={selectionMode ? `${selected ? '取消选择' : '选择'}${item.name}` : `查看${item.name}`}
      accessibilityState={selectionMode ? { selected } : undefined}
      delayLongPress={500}
      onLongPress={handleLongPress}
      onPress={handlePress}
      style={[resultRowStyle, selected ? resultRowSelectedStyle : null]}
    >
      <View style={resultThumbStyle}>
        {imageUri ? (
          <InventoryImage url={item.images[0]} resizeMode="cover" style={resultThumbImageStyle} />
        ) : (
          <InventoryIcon type={item.type} isLocation={isLocationItem(item)} size="md" />
        )}
      </View>
      <View style={resultTextStyle}>
        <View style={resultTitleLineStyle}>
          <Text numberOfLines={1} style={resultTitleStyle}>{item.name}</Text>
          {item.type === 'item' ? <StatusBadge status={item.status} /> : <Text style={containerPillStyle}>{getContainerTypeLabel(item)}</Text>}
        </View>
        {item.category ? <Text numberOfLines={1} style={resultCategoryStyle}>{item.category}</Text> : null}
        {path ? (
          <View style={pathLineStyle}>
            <Ionicons name="location-outline" size={13} color={palette.textSoft} />
            <Text numberOfLines={1} style={pathTextStyle}>{path}</Text>
          </View>
        ) : null}
      </View>
      {selectionMode ? (
        <View style={[selectionDotStyle, selected ? selectionDotActiveStyle : null]}>
          {selected ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={palette.textSoft} />
      )}
    </Pressable>
  );
}

export function LocationFilterSheet({
  visible,
  userId,
  selectedLocationId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  userId?: string;
  selectedLocationId: string | null;
  onClose: () => void;
  onSelect: (locationId: string | null) => void;
}) {
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Item[]>([]);

  const selectedPathQuery = useQuery({
    queryKey: ['mobile', 'overview-location-filter-path', selectedLocationId],
    enabled: visible && Boolean(selectedLocationId),
    queryFn: async () => {
      const ancestors = await itemsApi.fetchAncestors(selectedLocationId!);
      return formatMobileLocationPath(ancestors);
    },
  });

  const currentContainersQuery = useQuery({
    queryKey: ['mobile', 'overview-location-filter-children', userId, currentParentId],
    enabled: visible && Boolean(userId),
    queryFn: async () => {
      const children = await itemsApi.fetchChildren(currentParentId, userId!);
      return children.filter((item) => item.type === 'container');
    },
  });

  useEffect(() => {
    if (!visible) {
      setCurrentParentId(null);
      setBreadcrumbs([]);
    }
  }, [visible]);

  const selectedParentPath = selectedLocationId
    ? selectedPathQuery.data ?? '加载位置...'
    : '全部位置/收纳';

  const handleNavigate = (index: number) => {
    if (index < 0) {
      setBreadcrumbs([]);
      setCurrentParentId(null);
      return;
    }

    const target = breadcrumbs[index];
    setBreadcrumbs((current) => current.slice(0, index + 1));
    setCurrentParentId(target.id);
  };

  return (
    <BottomSheet visible={visible} title="按位置筛选" onClose={onClose}>
      <LocationHierarchyPicker
        breadcrumbs={breadcrumbs}
        containers={currentContainersQuery.data ?? []}
        currentParentId={currentParentId}
        selectedParentId={selectedLocationId}
        selectedParentPath={selectedParentPath}
        isLoading={currentContainersQuery.isLoading}
        emptyText="暂无下级位置/收纳"
        showSelectedSummary={false}
        rootSelectLabel="全部位置/收纳"
        currentSelectLabel="筛选此位置"
        onSelect={onSelect}
        onNavigate={handleNavigate}
        onDrillDown={(container) => {
          setBreadcrumbs((current) => [...current, container]);
          setCurrentParentId(container.id);
        }}
      />
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

export function BottomSheet({ visible, title, children, onClose }: { visible: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
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

export const screenContentStyle = { paddingHorizontal: 16, gap: 8 };
export const pageTitleStyle = { fontSize: 28, lineHeight: 34, fontWeight: '900' as const, color: palette.text, paddingTop: 2 };
export const pageTitleRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  gap: 12,
};
export const selectionToggleStyle = {
  height: 38,
  borderRadius: 14,
  paddingHorizontal: 12,
  backgroundColor: palette.canvasStrong,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
};
export const selectionToggleActiveStyle = {
  backgroundColor: palette.brand,
};
export const selectionToggleTextStyle = {
  fontSize: 13,
  fontWeight: '800' as const,
  color: palette.textMuted,
};
export const selectionToggleActiveTextStyle = {
  color: '#ffffff',
};
export const searchBoxStyle = {
  minHeight: 44,
  borderRadius: 15,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surface,
  paddingHorizontal: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
  ...shadows.sm,
};
export const searchInputStyle = { flex: 1, minHeight: 40, fontSize: 15, color: palette.text };
export const clearButtonStyle = {
  width: 28,
  height: 28,
  borderRadius: 999,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: palette.surfaceMuted,
};
export const resultDividerStyle = { height: 1, marginHorizontal: -18, backgroundColor: palette.borderSoft };
export const resultSummaryStyle = { fontSize: 14, color: palette.textSoft, paddingTop: 6 };
export const resultListStyle = { gap: 8 };
export const loadedMetaStyle = { textAlign: 'center' as const, fontSize: 13, color: palette.textSoft };
export const loadingMoreStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 8,
  paddingBottom: 8,
};

const chipStyle = {
  minHeight: 30,
  maxWidth: '100%' as const,
  borderRadius: 999,
  backgroundColor: palette.canvasStrong,
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
  minHeight: 70,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surface,
  padding: 10,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
  ...shadows.sm,
};
const resultRowSelectedStyle = {
  borderColor: palette.brand,
  backgroundColor: palette.brandTint,
};
const resultThumbStyle = {
  width: 46,
  height: 46,
  borderRadius: 16,
  backgroundColor: palette.surfaceMuted,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  overflow: 'hidden' as const,
};
const resultThumbImageStyle = { width: '100%' as const, height: '100%' as const };
const resultTextStyle = { flex: 1, minWidth: 0, gap: 3 };
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
const selectionDotStyle = {
  width: 24,
  height: 24,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surface,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
const selectionDotActiveStyle = {
  borderColor: palette.brand,
  backgroundColor: palette.brand,
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
  maxHeight: '82%' as const,
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
  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 14,
  borderBottomWidth: 1,
  borderBottomColor: palette.borderSoft,
};
const sheetTitleStyle = { fontSize: 21, lineHeight: 27, fontWeight: '900' as const, color: palette.text };
const sheetCloseStyle = {
  width: 34,
  height: 34,
  borderRadius: 999,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: palette.surfaceMuted,
};
const sheetContentStyle = { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28, gap: 10 };
const sheetOptionStyle = {
  minHeight: 46,
  borderRadius: 13,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  gap: 10,
};
const sheetOptionActiveStyle = { backgroundColor: palette.brandTint, borderWidth: 1, borderColor: '#99f6e4' };
const sheetOptionTextStyle = { flex: 1, fontSize: 14, fontWeight: '800' as const, color: palette.text };
const sheetOptionCountStyle = {
  borderRadius: 999,
  backgroundColor: palette.canvasStrong,
  paddingHorizontal: 8,
  paddingVertical: 3,
  fontSize: 12,
  fontWeight: '800' as const,
  color: palette.textMuted,
};
const sheetSearchStyle = {
  minHeight: 44,
  borderRadius: 13,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
};
const sheetSearchInputStyle = { flex: 1, minHeight: 40, fontSize: 14, color: palette.text };
const emptySheetTextStyle = { paddingVertical: 24, textAlign: 'center' as const, color: palette.textSoft };
