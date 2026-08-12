import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ItemStatus } from '@inplace/domain';
import { ITEM_STATUS_PRESENTATION, ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { useHousehold } from '@/providers/HouseholdProvider';
import { HouseholdButton } from '@/shared/ui/HouseholdButton';
import { categoriesApi, itemsApi } from '@/shared/api/mobileClient';
import { isLocationItem } from '@/shared/lib/location';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { BulkActionBar } from '@/shared/ui/BulkActionBar';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Screen } from '@/shared/ui/Screen';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';
import { HomeBulkEditSheet, type BulkEditPayload } from '@/features/home/HomeBulkEditSheet';
import { buildMobileItemPath } from '@/features/inventory/mobileInventoryFormat';
import { OverviewFilterControls, type FilterOption, type OverviewViewMode } from '@/features/overview/OverviewFilterControls';
import { HierarchyResultGroup } from '@/features/overview/OverviewResults';
import {
  LocationFilterSheet,
  ResultRow,
  TagFilterSheet,
  clearButtonStyle,
  loadedMetaStyle,
  loadingMoreStyle,
  pageTitleStyle,
  pageTitleRowStyle,
  selectionToggleStyle,
  selectionToggleActiveStyle,
  selectionToggleTextStyle,
  selectionToggleActiveTextStyle,
  resultDividerStyle,
  resultListStyle,
  resultSummaryStyle,
  screenContentStyle,
  searchBoxStyle,
  searchInputStyle,
} from '@/features/overview/OverviewMobileUi';
import {
  buildAvailableTags,
  buildHierarchyItems,
  fetchAllOverviewItems,
  normalizeStatusFilter,
  normalizeTags,
  normalizeTypeFilter,
  type TypeFilterValue,
} from '@/features/overview/overviewMobileData';
import { SavedSearchesCard } from '@/features/overview/SavedSearchesCard';

const PAGE_SIZE = 20;

const TYPE_FILTERS: FilterOption<TypeFilterValue>[] = [
  { value: 'all', label: '全部', icon: 'archive-outline' },
  { value: 'location', label: '位置', icon: 'location-outline' },
  { value: 'container', label: ITEM_TYPE_PRESENTATION.container.label, icon: 'file-tray-stacked' },
  { value: 'item', label: ITEM_TYPE_PRESENTATION.item.label, icon: 'cube' },
];

const STATUS_FILTERS: FilterOption<ItemStatus | 'all'>[] = [
  { value: 'all', label: '全部' },
  { value: 'in_stock', label: ITEM_STATUS_PRESENTATION.in_stock.label },
  { value: 'borrowed', label: ITEM_STATUS_PRESENTATION.borrowed.label },
  { value: 'worn_out', label: ITEM_STATUS_PRESENTATION.worn_out.label },
];

const VIEW_MODE_FILTERS: FilterOption<OverviewViewMode>[] = [
  { value: 'hierarchy', label: '层级', icon: 'git-branch-outline' },
  { value: 'flat', label: '平铺', icon: 'grid-outline' },
];

const VALID_TYPE_VALUES = new Set(TYPE_FILTERS.map((option) => option.value));
const VALID_STATUS_VALUES = new Set(STATUS_FILTERS.map((option) => option.value));

export default function OverviewTab() {
  const { user } = useAuth();
  const { currentHouseholdId, canEditInventory } = useHousehold();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    q?: string;
    type?: TypeFilterValue;
    status?: ItemStatus | 'all';
    locationId?: string;
    tag?: string | string[];
    view?: OverviewViewMode;
  }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [isTagSheetOpen, setIsTagSheetOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [viewMode, setViewMode] = useState<OverviewViewMode>(params.view === 'flat' ? 'flat' : 'hierarchy');
  const debouncedQuery = useDebouncedValue(query, 250);

  useEffect(() => {
    setQuery(params.q ?? '');
  }, [params.q]);

  useEffect(() => {
    setViewMode(params.view === 'flat' ? 'flat' : 'hierarchy');
  }, [params.view]);

  const typeFilter = normalizeTypeFilter(params.type, VALID_TYPE_VALUES);
  const statusFilter = normalizeStatusFilter(params.status, VALID_STATUS_VALUES);
  const selectedTags = normalizeTags(params.tag);
  const selectedTagsKey = selectedTags.join('\u0000');
  const selectedLocationId = params.locationId ?? null;
  const effectiveTypeFilter = typeFilter === 'location' ? 'container' : typeFilter === 'all' ? undefined : typeFilter;
  const effectiveStatusFilter = typeFilter === 'location' || typeFilter === 'container' || statusFilter === 'all' ? undefined : statusFilter;

  const allItemsQuery = useQuery({
    queryKey: ['mobile', 'overview-all-items', currentHouseholdId, user?.id],
    enabled: Boolean(user),
    staleTime: 1000 * 60,
    queryFn: () => fetchAllOverviewItems(user!.id),
  });

  const categoriesQuery = useQuery({
    queryKey: ['mobile', 'overview-categories', currentHouseholdId, user?.id],
    enabled: Boolean(user),
    staleTime: 1000 * 60,
    queryFn: () => categoriesApi.fetchCategories(user!.id),
  });

  const searchQuery = useInfiniteQuery({
    queryKey: ['mobile', 'overview-search', currentHouseholdId, user?.id, debouncedQuery, typeFilter, effectiveStatusFilter, selectedLocationId, selectedTagsKey],
    enabled: Boolean(user),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => itemsApi.searchItemsPage(debouncedQuery, user!.id, {
      page: pageParam,
      pageSize: PAGE_SIZE,
      type: effectiveTypeFilter,
      status: effectiveStatusFilter,
      locationId: selectedLocationId,
      locationOnly: typeFilter === 'location',
      tags: selectedTags,
    }),
    getNextPageParam: (lastPage) => (lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined),
  });

  const allItems = useMemo(() => allItemsQuery.data ?? [], [allItemsQuery.data]);
  const itemMap = useMemo(() => new Map(allItems.map((item) => [item.id, item])), [allItems]);
  const availableTags = useMemo(() => buildAvailableTags(allItems), [allItems]);
  const filteredAvailableTags = useMemo(() => {
    const normalizedTagQuery = tagQuery.trim().toLocaleLowerCase('zh-CN');
    return availableTags.filter((tag) => tag.name.toLocaleLowerCase('zh-CN').includes(normalizedTagQuery));
  }, [availableTags, tagQuery]);
  const selectedLocation = selectedLocationId ? itemMap.get(selectedLocationId) ?? null : null;
  const pages = searchQuery.data?.pages ?? [];
  const flatItems = pages.flatMap((page) => page.data);
  const meta = pages[pages.length - 1]?.meta;
  const hierarchyItems = useMemo(
    () => buildHierarchyItems({
      items: allItems,
      parentId: selectedLocationId,
      query: debouncedQuery,
      typeFilter,
      statusFilter,
      selectedTags,
    }),
    [allItems, debouncedQuery, selectedLocationId, selectedTags, statusFilter, typeFilter],
  );
  const hierarchyContainers = hierarchyItems.filter((item) => item.type === 'container');
  const hierarchyLeafItems = hierarchyItems.filter((item) => item.type === 'item');
  const visibleItems = viewMode === 'hierarchy' ? hierarchyItems : flatItems;
  const selectedItems = useMemo(
    () => visibleItems.filter((item) => selectedIds.includes(item.id)),
    [selectedIds, visibleItems],
  );
  const total = viewMode === 'hierarchy' ? hierarchyItems.length : meta?.total ?? flatItems.length;

  useEffect(() => {
    setSelectedIds([]);
  }, [debouncedQuery, selectedLocationId, selectedTagsKey, statusFilter, typeFilter, viewMode]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (viewMode !== 'flat' || !searchQuery.hasNextPage || searchQuery.isFetchingNextPage) {
      return;
    }

    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromBottom < 160) {
      void searchQuery.fetchNextPage();
    }
  };

  const updateParams = (nextParams: Record<string, string | string[] | undefined>) => {
    router.setParams(nextParams);
  };

  const handleTypeChange = (value: TypeFilterValue) => {
    updateParams({
      type: value === 'all' ? undefined : value,
      status: value === 'location' || value === 'container' ? undefined : params.status,
    });
  };

  const handleStatusChange = (value: ItemStatus | 'all') => {
    updateParams({ status: value === 'all' ? undefined : value });
  };

  const handleLocationChange = (locationId: string | null) => {
    updateParams({ locationId: locationId ?? undefined });
    setIsLocationSheetOpen(false);
  };

  const handleToggleTag = (tagName: string) => {
    const nextTags = selectedTags.includes(tagName)
      ? selectedTags.filter((tag) => tag !== tagName)
      : [...selectedTags, tagName];
    updateParams({ tag: nextTags.length > 0 ? nextTags : undefined });
  };

  const handleClearFilters = () => {
    updateParams({
      type: undefined,
      status: undefined,
      locationId: undefined,
      tag: undefined,
    });
  };

  const handleViewModeChange = (value: OverviewViewMode) => {
    setViewMode(value);
    updateParams({ view: value === 'hierarchy' ? undefined : value });
  };

  const handleToggleSelectionMode = () => {
    setSelectionMode((current) => {
      if (current) {
        setSelectedIds([]);
      }

      return !current;
    });
  };

  const handleToggleSelected = (itemId: string) => {
    setSelectedIds((current) => (
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    ));
  };

  const handleBulkSave = async (payload: BulkEditPayload) => {
    await itemsApi.updateItemsBatch(selectedIds, payload);
    await Promise.all([
      allItemsQuery.refetch(),
      searchQuery.refetch(),
    ]);
    setIsBulkEditOpen(false);
    setSelectedIds([]);
    setSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    await itemsApi.deleteItemsBatch(selectedIds);
    await Promise.all([
      allItemsQuery.refetch(),
      searchQuery.refetch(),
    ]);
    setIsBulkDeleteOpen(false);
    setSelectedIds([]);
    setSelectionMode(false);
  };

  if (allItemsQuery.isError || searchQuery.isError || categoriesQuery.isError) {
    const error = allItemsQuery.error ?? searchQuery.error ?? categoriesQuery.error;
    return <Screen><StateBlock title="库存加载失败" body={error instanceof Error ? error.message : '请稍后重试'} /></Screen>;
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen
        scroll
        contentInsetMode="tight"
        chrome="muted"
        contentStyle={selectionMode ? { ...screenContentStyle, paddingBottom: 112 } : screenContentStyle}
        scrollProps={{ onScroll: handleScroll, scrollEventThrottle: 16 }}
      >
      <View style={pageTitleRowStyle}>
        <Text style={pageTitleStyle}>库存</Text>
        <HouseholdButton compact />
        {canEditInventory ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={selectionMode ? '退出批量选择' : '进入批量选择'}
            onPress={handleToggleSelectionMode}
            style={[selectionToggleStyle, selectionMode ? selectionToggleActiveStyle : null]}
          >
            <Ionicons name={selectionMode ? 'close' : 'checkbox-outline'} size={16} color={selectionMode ? '#ffffff' : palette.textMuted} />
            <Text style={[selectionToggleTextStyle, selectionMode ? selectionToggleActiveTextStyle : null]}>
              {selectionMode ? '退出' : '批量'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={searchBoxStyle}>
        <Ionicons name="search-outline" size={23} color={palette.textSoft} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onEndEditing={() => updateParams({ q: query.trim() || undefined })}
          placeholder="搜索名称、描述或标签"
          placeholderTextColor={palette.textSoft}
          style={searchInputStyle}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => { setQuery(''); updateParams({ q: undefined }); }} style={clearButtonStyle}>
            <Ionicons name="close" size={16} color={palette.textSoft} />
          </Pressable>
        ) : null}
      </View>

      <OverviewFilterControls
        typeFilters={TYPE_FILTERS}
        statusFilters={STATUS_FILTERS}
        viewModeFilters={VIEW_MODE_FILTERS}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        viewMode={viewMode}
        selectedLocationName={selectedLocation?.name ?? null}
        selectedTagsCount={selectedTags.length}
        onChangeType={handleTypeChange}
        onChangeStatus={handleStatusChange}
        onChangeViewMode={handleViewModeChange}
        onClearFilters={handleClearFilters}
        onOpenLocationFilter={() => setIsLocationSheetOpen(true)}
        onOpenTagFilter={() => setIsTagSheetOpen(true)}
      />
      <SavedSearchesCard
        filters={{
          q: query.trim(),
          type: typeFilter,
          status: statusFilter,
          locationId: selectedLocationId,
          tags: selectedTags,
          view: viewMode,
        }}
        onApply={(filters) => {
          setQuery(filters.q);
          updateParams({
            q: filters.q || undefined,
            type: filters.type === 'all' ? undefined : filters.type,
            status: filters.status === 'all' ? undefined : filters.status,
            locationId: filters.locationId ?? undefined,
            tag: filters.tags.length > 0 ? filters.tags : undefined,
            view: filters.view === 'hierarchy' ? undefined : filters.view,
          });
        }}
      />

      <View style={resultDividerStyle} />
      <Text style={resultSummaryStyle}>共 {total} 个结果</Text>

      {(viewMode === 'flat' && searchQuery.isLoading) || allItemsQuery.isLoading ? <StateBlock title="搜索中" loading /> : null}

      {viewMode === 'hierarchy' ? (
        <>
          {hierarchyItems.length === 0 && !allItemsQuery.isLoading ? <StateBlock title="暂无结果" body="调整关键词后再试" /> : null}
          <HierarchyResultGroup
            title={`下级位置/收纳 ${hierarchyContainers.length}`}
            items={hierarchyContainers}
            itemMap={itemMap}
            categories={categoriesQuery.data ?? []}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelected={handleToggleSelected}
          />
          <HierarchyResultGroup
            title={`下级物品 ${hierarchyLeafItems.length}`}
            items={hierarchyLeafItems}
            itemMap={itemMap}
            categories={categoriesQuery.data ?? []}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelected={handleToggleSelected}
          />
        </>
      ) : (
        <>
          {!searchQuery.isLoading && flatItems.length === 0 ? <StateBlock title="暂无结果" body="调整关键词后再试" /> : null}
          <View style={resultListStyle}>
            {flatItems.map((item) => (
              <ResultRow
                key={item.id}
                item={item}
                category={(categoriesQuery.data ?? []).find((category) => (
                  category.name === item.category
                  && category.scope === (item.type === 'item' ? 'item' : isLocationItem(item) ? 'location' : 'container')
                ))}
                path={buildMobileItemPath(item, itemMap)}
                selectionMode={selectionMode}
                selected={selectedIds.includes(item.id)}
                onToggleSelected={handleToggleSelected}
              />
            ))}
          </View>
        </>
      )}

      {viewMode === 'flat' && meta ? (
        <Text style={loadedMetaStyle}>
          {searchQuery.hasNextPage ? `已加载 ${flatItems.length} / ${meta.total}，继续上滑加载更多` : `已展示全部 ${meta.total} 个结果`}
        </Text>
      ) : null}

      {viewMode === 'flat' && searchQuery.isFetchingNextPage ? (
        <View style={loadingMoreStyle}>
          <ActivityIndicator color={palette.brand} />
          <Text style={loadedMetaStyle}>加载更多...</Text>
        </View>
      ) : null}

      <LocationFilterSheet
        visible={isLocationSheetOpen}
        userId={user?.id}
        selectedLocationId={selectedLocationId}
        onClose={() => setIsLocationSheetOpen(false)}
        onSelect={handleLocationChange}
      />
      <TagFilterSheet
        visible={isTagSheetOpen}
        tags={filteredAvailableTags}
        selectedTags={selectedTags}
        tagQuery={tagQuery}
        onChangeQuery={setTagQuery}
        onClear={() => updateParams({ tag: undefined })}
        onClose={() => setIsTagSheetOpen(false)}
        onToggleTag={handleToggleTag}
      />
      </Screen>
      {selectionMode ? (
        <BulkActionBar
          selectedCount={selectedIds.length}
          bottom={Math.max(insets.bottom, 10) + 14}
          onEdit={() => setIsBulkEditOpen(true)}
          onDelete={() => setIsBulkDeleteOpen(true)}
        />
      ) : null}
      <HomeBulkEditSheet
        visible={isBulkEditOpen}
        items={selectedItems}
        allItems={allItems}
        categories={categoriesQuery.data ?? []}
        onClose={() => setIsBulkEditOpen(false)}
        onSave={handleBulkSave}
      />
      <ConfirmDialog
        visible={isBulkDeleteOpen}
        title="确认批量删除"
        message={`删除已选择的 ${selectedIds.length} 项？下级内容也会一并删除。`}
        confirmLabel="删除"
        danger
        onCancel={() => setIsBulkDeleteOpen(false)}
        onConfirm={() => void handleBulkDelete()}
      />
    </View>
  );
}
