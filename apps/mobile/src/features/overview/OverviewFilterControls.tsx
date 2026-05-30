import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { ItemStatus } from '@inplace/domain';
import { palette, shadows } from '@/shared/ui/theme';
import { BottomSheet, FilterChip } from './OverviewMobileUi';
import type { TypeFilterValue } from './overviewMobileData';

export type OverviewViewMode = 'hierarchy' | 'flat';

export interface FilterOption<TValue extends string> {
  value: TValue;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface OverviewFilterControlsProps {
  typeFilters: FilterOption<TypeFilterValue>[];
  statusFilters: FilterOption<ItemStatus | 'all'>[];
  viewModeFilters: FilterOption<OverviewViewMode>[];
  typeFilter: TypeFilterValue;
  statusFilter: ItemStatus | 'all';
  viewMode: OverviewViewMode;
  selectedLocationName: string | null;
  selectedTagsCount: number;
  onChangeType: (value: TypeFilterValue) => void;
  onChangeStatus: (value: ItemStatus | 'all') => void;
  onChangeViewMode: (value: OverviewViewMode) => void;
  onClearFilters: () => void;
  onOpenLocationFilter: () => void;
  onOpenTagFilter: () => void;
}

export function OverviewFilterControls({
  typeFilters,
  statusFilters,
  viewModeFilters,
  typeFilter,
  statusFilter,
  viewMode,
  selectedLocationName,
  selectedTagsCount,
  onChangeType,
  onChangeStatus,
  onChangeViewMode,
  onClearFilters,
  onOpenLocationFilter,
  onOpenTagFilter,
}: OverviewFilterControlsProps) {
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const isStatusDisabled = typeFilter === 'location' || typeFilter === 'container';
  const activeFilterLabels = useMemo(
    () => buildActiveFilterLabels({
      typeFilters,
      statusFilters,
      typeFilter,
      statusFilter,
      isStatusDisabled,
      selectedLocationName,
      selectedTagsCount,
    }),
    [isStatusDisabled, selectedLocationName, selectedTagsCount, statusFilter, statusFilters, typeFilter, typeFilters],
  );

  const handleOpenLocationFilter = () => {
    onOpenLocationFilter();
  };

  const handleOpenTagFilter = () => {
    onOpenTagFilter();
  };

  return (
    <>
      <View style={filterPanelStyle}>
        <View style={filterGroupStyle}>
          <Text style={filterGroupLabelStyle}>展示方式</Text>
          <View style={viewSegmentStyle}>
            {viewModeFilters.map((option) => {
              const isActive = viewMode === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  onPress={() => onChangeViewMode(option.value)}
                  style={[viewSegmentButtonStyle, isActive ? viewSegmentButtonActiveStyle : null]}
                >
                  {option.icon ? <Ionicons name={option.icon} size={14} color={isActive ? palette.text : palette.textSoft} /> : null}
                  <Text style={[viewSegmentButtonTextStyle, isActive ? viewSegmentButtonTextActiveStyle : null]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={filterGroupStyle}>
          <Text style={filterGroupLabelStyle}>对象类型</Text>
          <View style={typeFilterRowStyle}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={quickFilterRailStyle} style={typeFilterScrollStyle}>
              {typeFilters.map((option) => (
                <FilterChip
                  key={option.value}
                  active={typeFilter === option.value}
                  icon={option.icon}
                  label={option.label}
                  onPress={() => onChangeType(option.value)}
                />
              ))}
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={() => setIsFilterSheetOpen(true)} style={filterButtonStyle}>
              <Ionicons name="options-outline" size={15} color="#ffffff" />
              <Text style={filterButtonTextStyle}>更多</Text>
              {activeFilterLabels.length > 0 ? (
                <View style={filterButtonBadgeStyle}>
                  <Text style={filterButtonBadgeTextStyle}>{activeFilterLabels.length}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>

        {activeFilterLabels.length > 0 ? (
          <View style={activeFilterRailStyle}>
            <Text style={activeFilterLabelStyle}>已选</Text>
            {activeFilterLabels.map((label) => (
              <View key={label} style={activeFilterPillStyle}>
                <Text numberOfLines={1} style={activeFilterPillTextStyle}>{label}</Text>
              </View>
            ))}
            <Pressable accessibilityRole="button" onPress={onClearFilters} style={clearFiltersButtonStyle}>
              <Text style={clearFiltersTextStyle}>清除</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <BottomSheet visible={isFilterSheetOpen} title="筛选条件" onClose={() => setIsFilterSheetOpen(false)}>
        {activeFilterLabels.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={onClearFilters} style={sheetClearButtonStyle}>
            <Ionicons name="refresh-outline" size={16} color={palette.textMuted} />
            <Text style={sheetClearButtonTextStyle}>清除筛选</Text>
          </Pressable>
        ) : null}

        <FilterSection title="状态" helper={isStatusDisabled ? '位置/收纳不参与物品状态筛选。' : undefined}>
          {statusFilters.map((option) => (
            <FilterChip
              key={option.value}
              active={statusFilter === option.value}
              disabled={isStatusDisabled}
              label={option.label}
              onPress={() => onChangeStatus(option.value)}
            />
          ))}
        </FilterSection>

        <FilterSection title="范围">
          <Pressable accessibilityRole="button" onPress={handleOpenLocationFilter} style={secondaryFilterButtonStyle}>
            <Ionicons name="git-branch-outline" size={16} color={palette.textMuted} />
            <Text numberOfLines={1} style={secondaryFilterButtonTextStyle}>{selectedLocationName ?? '全部位置'}</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.textSoft} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={handleOpenTagFilter} style={secondaryFilterButtonStyle}>
            <Ionicons name="pricetag-outline" size={16} color={palette.textMuted} />
            <Text numberOfLines={1} style={secondaryFilterButtonTextStyle}>
              {selectedTagsCount > 0 ? `已选 ${selectedTagsCount} 个标签` : '全部标签'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={palette.textSoft} />
          </Pressable>
        </FilterSection>
      </BottomSheet>
    </>
  );
}

function FilterSection({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={filterSectionStyle}>
      <View style={filterSectionHeaderStyle}>
        <Text style={filterSectionTitleStyle}>{title}</Text>
        {helper ? <Text style={filterSectionHelperStyle}>{helper}</Text> : null}
      </View>
      <View style={filterSectionBodyStyle}>{children as never}</View>
    </View>
  );
}

function buildActiveFilterLabels({
  typeFilters,
  statusFilters,
  typeFilter,
  statusFilter,
  isStatusDisabled,
  selectedLocationName,
  selectedTagsCount,
}: {
  typeFilters: FilterOption<TypeFilterValue>[];
  statusFilters: FilterOption<ItemStatus | 'all'>[];
  typeFilter: TypeFilterValue;
  statusFilter: ItemStatus | 'all';
  isStatusDisabled: boolean;
  selectedLocationName: string | null;
  selectedTagsCount: number;
}) {
  const labels: string[] = [];

  if (typeFilter !== 'all') {
    labels.push(getFilterLabel(typeFilters, typeFilter));
  }

  if (!isStatusDisabled && statusFilter !== 'all') {
    labels.push(getFilterLabel(statusFilters, statusFilter));
  }

  if (selectedLocationName) {
    labels.push(`范围：${selectedLocationName}`);
  }

  if (selectedTagsCount > 0) {
    labels.push(`标签：${selectedTagsCount}`);
  }

  return labels;
}

function getFilterLabel<TValue extends string>(options: FilterOption<TValue>[], value: TValue) {
  return options.find((option) => option.value === value)?.label ?? value;
}

const filterPanelStyle = {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surface,
  padding: 8,
  gap: 8,
  ...shadows.sm,
};

const filterGroupStyle = {
  gap: 6,
};

const filterGroupLabelStyle = {
  fontSize: 12,
  fontWeight: '900' as const,
  color: palette.textSoft,
};

const typeFilterRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 8,
};

const typeFilterScrollStyle = {
  flex: 1,
  minWidth: 0,
};

const viewSegmentStyle = {
  minHeight: 34,
  borderRadius: 12,
  backgroundColor: palette.surfaceMuted,
  padding: 3,
  flexDirection: 'row' as const,
  gap: 3,
};

const viewSegmentButtonStyle = {
  flex: 1,
  minHeight: 28,
  borderRadius: 10,
  paddingHorizontal: 8,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 5,
};

const viewSegmentButtonActiveStyle = {
  backgroundColor: palette.surface,
  ...shadows.sm,
};

const viewSegmentButtonTextStyle = {
  fontSize: 13,
  fontWeight: '800' as const,
  color: palette.textSoft,
};

const viewSegmentButtonTextActiveStyle = {
  color: palette.text,
};

const filterButtonStyle = {
  minHeight: 34,
  borderRadius: 12,
  backgroundColor: palette.text,
  paddingHorizontal: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 6,
};

const filterButtonTextStyle = {
  fontSize: 13,
  fontWeight: '900' as const,
  color: '#ffffff',
};

const filterButtonBadgeStyle = {
  minWidth: 18,
  height: 18,
  borderRadius: 999,
  backgroundColor: palette.brand,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  paddingHorizontal: 5,
};

const filterButtonBadgeTextStyle = {
  fontSize: 11,
  fontWeight: '900' as const,
  color: '#ffffff',
};

const quickFilterRailStyle = {
  gap: 6,
  paddingRight: 4,
};

const activeFilterRailStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  alignItems: 'center' as const,
  gap: 6,
};

const activeFilterLabelStyle = {
  fontSize: 12,
  fontWeight: '800' as const,
  color: palette.textSoft,
};

const activeFilterPillStyle = {
  minHeight: 28,
  borderRadius: 999,
  backgroundColor: palette.brandTint,
  borderWidth: 1,
  borderColor: '#99f6e4',
  paddingHorizontal: 9,
  justifyContent: 'center' as const,
};

const activeFilterPillTextStyle = {
  fontSize: 12,
  fontWeight: '800' as const,
  color: palette.brandStrong,
};

const clearFiltersButtonStyle = {
  minHeight: 28,
  borderRadius: 999,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 9,
  justifyContent: 'center' as const,
};

const clearFiltersTextStyle = {
  fontSize: 12,
  fontWeight: '800' as const,
  color: palette.textMuted,
};

const sheetClearButtonStyle = {
  minHeight: 38,
  borderRadius: 12,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 6,
};

const sheetClearButtonTextStyle = {
  fontSize: 14,
  fontWeight: '800' as const,
  color: palette.textMuted,
};

const secondaryFilterButtonStyle = {
  width: '100%' as const,
  minHeight: 40,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  gap: 10,
};

const secondaryFilterButtonTextStyle = {
  flex: 1,
  minWidth: 0,
  fontSize: 14,
  fontWeight: '800' as const,
  color: palette.text,
};

const filterSectionStyle = {
  borderRadius: 14,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surface,
  padding: 10,
  gap: 8,
};

const filterSectionHeaderStyle = {
  gap: 3,
};

const filterSectionTitleStyle = {
  fontSize: 15,
  fontWeight: '900' as const,
  color: palette.text,
};

const filterSectionHelperStyle = {
  fontSize: 12,
  lineHeight: 17,
  color: palette.textSoft,
};

const filterSectionBodyStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 8,
};
