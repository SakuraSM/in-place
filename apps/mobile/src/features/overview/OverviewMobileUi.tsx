import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { controlSizes } from '@inplace/ui/mobile';
import { BottomSheet } from '@/shared/ui/BottomSheet';
export { BottomSheet } from '@/shared/ui/BottomSheet';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { Category, Item } from '@inplace/domain';
import { itemsApi } from '@/shared/api/mobileClient';
import { useHousehold } from '@/providers/HouseholdProvider';
import { resolveMobileContainerBrowseHref, resolveMobileDetailHref } from '@/shared/lib/detailPath';
import { getContainerTypeLabel } from '@/shared/lib/location';
import { LocationHierarchyPicker } from '@/features/home/LocationHierarchyPicker';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { palette, shadows } from '@/shared/ui/theme';
import { formatMobileLocationPath } from '@/features/inventory/mobileInventoryFormat';
import { OverviewResultArtwork } from './OverviewResultArtwork';
import { OverviewResultCard } from './OverviewResultCard';

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
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active, disabled }} disabled={disabled} onPress={onPress} style={[chipStyle, active ? activeChipStyle : null, disabled ? disabledChipStyle : null]}>
      {icon ? <Ionicons name={icon} size={13} color={active ? palette.brandStrong : palette.textMuted} /> : null}
      <Text numberOfLines={1} style={active ? activeChipTextStyle : chipTextStyle}>{label}</Text>
    </Pressable>
  );
}

interface ResultRowProps {
  item: Item;
  category?: Category;
  path: string;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelected?: (itemId: string) => void;
  presentation?: 'row' | 'card';
}

export function ResultRow({ item, category, path, selectionMode = false, selected = false, onToggleSelected, presentation = 'row' }: ResultRowProps) {
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
      style={[presentation === 'card' ? resultCardStyle : resultRowStyle, selected ? resultRowSelectedStyle : null]}
    >
      {presentation === 'card' ? <OverviewResultCard item={item} category={category} path={path} selected={selected} /> : <>
      <View style={resultThumbStyle}>
        <OverviewResultArtwork item={item} category={category} presentation="row" />
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
      </>}
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
  const { currentHouseholdId } = useHousehold();
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Item[]>([]);

  const selectedPathQuery = useQuery({
    queryKey: ['mobile', 'overview-location-filter-path', currentHouseholdId, selectedLocationId],
    enabled: visible && Boolean(selectedLocationId),
    queryFn: async () => {
      const ancestors = await itemsApi.fetchAncestors(selectedLocationId!);
      return formatMobileLocationPath(ancestors);
    },
  });

  const currentContainersQuery = useQuery({
    queryKey: ['mobile', 'overview-location-filter-children', currentHouseholdId, userId, currentParentId],
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
    <BottomSheet visible={visible} title="标签筛选 · 匹配任一" onClose={onClose}>
      <View style={sheetSearchStyle}>
        <Ionicons name="search-outline" size={17} color={palette.textSoft} />
        <TextInput value={tagQuery} onChangeText={onChangeQuery} accessibilityLabel="搜索标签" placeholder="搜索标签" style={sheetSearchInputStyle} />
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

export const screenContentStyle = { paddingHorizontal: 16, gap: 8 };
export const pageTitleStyle = { fontSize: 28, lineHeight: 34, fontWeight: '600' as const, color: palette.text, paddingTop: 2 };
export const pageTitleRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  gap: 12,
};
export const selectionToggleStyle = {
  minHeight: controlSizes.touch,
  borderRadius: 12,
  paddingHorizontal: 12,
  backgroundColor: palette.canvasStrong,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
};
export const selectionToggleActiveStyle = {
  backgroundColor: palette.brandStrong,
};
export const selectionToggleTextStyle = {
  fontSize: 13,
  fontWeight: '600' as const,
  color: palette.textMuted,
};
export const selectionToggleActiveTextStyle = {
  color: '#ffffff',
};
export const searchBoxStyle = {
  minHeight: controlSizes.touch,
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
export const searchInputStyle = { flex: 1, minHeight: 40, fontSize: 14, color: palette.text };
export const clearButtonStyle = {
  width: controlSizes.touch,
  height: controlSizes.touch,
  borderRadius: 999,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: palette.surfaceMuted,
};
export const resultDividerStyle = { height: 1, marginHorizontal: -18, backgroundColor: palette.borderSoft };
export const resultSummaryStyle = { fontSize: 14, color: palette.textSoft, paddingTop: 6 };
export const resultListStyle = { gap: 0 };
export const loadedMetaStyle = { textAlign: 'center' as const, fontSize: 13, color: palette.textSoft };
export const loadingMoreStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 8,
  paddingBottom: 8,
};

const chipStyle = {
  minHeight: controlSizes.touch,
  minWidth: controlSizes.touch,
  maxWidth: '100%' as const,
  borderRadius: 999,
  backgroundColor: palette.surface,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 9,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 4,
};
const activeChipStyle = { backgroundColor: palette.brandTint, borderColor: palette.brandStrong };
const disabledChipStyle = { opacity: 0.42 };
const chipTextStyle = { fontSize: 12, fontWeight: '600' as const, color: palette.textMuted };
const activeChipTextStyle = { fontSize: 12, fontWeight: '600' as const, color: palette.brandStrong };
const resultRowStyle = {
  minHeight: 82,
  borderRadius: 0,
  borderBottomWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: 'transparent',
  paddingVertical: 14,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
  ...shadows.sm,
};
const resultCardStyle = { width: '100%' as const, flexGrow: 1, overflow: 'hidden' as const, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface };
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
const resultTextStyle = { flex: 1, minWidth: 0, gap: 3 };
const resultTitleLineStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 };
const resultTitleStyle = { flex: 1, fontSize: 16, fontWeight: '600' as const, color: palette.text };
const resultCategoryStyle = { fontSize: 13, color: palette.textMuted };
const pathLineStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 };
const pathTextStyle = { flex: 1, fontSize: 13, color: palette.textSoft };
const containerPillStyle = {
  borderRadius: 9,
  backgroundColor: palette.brandTint,
  paddingHorizontal: 8,
  paddingVertical: 3,
  fontSize: 11,
  fontWeight: '600' as const,
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
  backgroundColor: palette.brandStrong,
};
const sheetOptionStyle = {
  minHeight: controlSizes.touch,
  borderRadius: 13,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  gap: 10,
};
const sheetOptionActiveStyle = { backgroundColor: palette.brandTint, borderWidth: 1, borderColor: '#99f6e4' };
const sheetOptionTextStyle = { flex: 1, fontSize: 14, fontWeight: '600' as const, color: palette.text };
const sheetOptionCountStyle = {
  borderRadius: 999,
  backgroundColor: palette.canvasStrong,
  paddingHorizontal: 8,
  paddingVertical: 3,
  fontSize: 12,
  fontWeight: '600' as const,
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
