import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import type { ItemStatus } from '@inplace/domain';
import { ITEM_STATUS_PRESENTATION, ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { itemsApi } from '@/shared/api/mobileClient';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { isLocationItem } from '@/shared/lib/location';
import { Screen } from '@/shared/ui/Screen';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';
import { buildMobileItemPath } from '@/features/inventory/mobileInventoryFormat';
import {
  FilterChip,
  FilterRow,
  LocationFilterSheet,
  ResultRow,
  TagFilterSheet,
  clearButtonStyle,
  filterPanelStyle,
  loadedMetaStyle,
  loadingMoreStyle,
  pageTitleStyle,
  resultDividerStyle,
  resultListStyle,
  resultSummaryStyle,
  screenContentStyle,
  searchBoxStyle,
  searchInputStyle,
} from '@/features/overview/OverviewMobileUi';
import {
  buildAvailableTags,
  fetchAllOverviewItems,
  normalizeStatusFilter,
  normalizeTags,
  normalizeTypeFilter,
  type TypeFilterValue,
} from '@/features/overview/overviewMobileData';

const PAGE_SIZE = 20;

interface FilterOption<TValue extends string> {
  value: TValue;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

const TYPE_FILTERS: FilterOption<TypeFilterValue>[] = [
  { value: 'all', label: '全部', icon: 'archive-outline' },
  { value: 'location', label: '位置', icon: 'location-outline' },
  { value: 'container', label: ITEM_TYPE_PRESENTATION.container.label, icon: 'cube-outline' },
  { value: 'item', label: ITEM_TYPE_PRESENTATION.item.label, icon: 'cube' },
];

const STATUS_FILTERS: FilterOption<ItemStatus | 'all'>[] = [
  { value: 'all', label: '全部' },
  { value: 'in_stock', label: ITEM_STATUS_PRESENTATION.in_stock.label },
  { value: 'borrowed', label: ITEM_STATUS_PRESENTATION.borrowed.label },
  { value: 'worn_out', label: ITEM_STATUS_PRESENTATION.worn_out.label },
];

const VALID_TYPE_VALUES = new Set(TYPE_FILTERS.map((option) => option.value));
const VALID_STATUS_VALUES = new Set(STATUS_FILTERS.map((option) => option.value));

export default function OverviewTab() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ q?: string; type?: TypeFilterValue; status?: ItemStatus | 'all'; locationId?: string; tag?: string | string[] }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);
  const [isTagSheetOpen, setIsTagSheetOpen] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);

  useEffect(() => {
    setQuery(params.q ?? '');
  }, [params.q]);

  const typeFilter = normalizeTypeFilter(params.type, VALID_TYPE_VALUES);
  const statusFilter = normalizeStatusFilter(params.status, VALID_STATUS_VALUES);
  const selectedTags = normalizeTags(params.tag);
  const selectedTagsKey = selectedTags.join('\u0000');
  const selectedLocationId = params.locationId ?? null;
  const effectiveTypeFilter = typeFilter === 'location' ? 'container' : typeFilter === 'all' ? undefined : typeFilter;
  const effectiveStatusFilter = typeFilter === 'location' || typeFilter === 'container' || statusFilter === 'all' ? undefined : statusFilter;

  const allItemsQuery = useQuery({
    queryKey: ['mobile', 'overview-all-items', user?.id],
    enabled: Boolean(user),
    staleTime: 1000 * 60,
    queryFn: () => fetchAllOverviewItems(user!.id),
  });

  const searchQuery = useInfiniteQuery({
    queryKey: ['mobile', 'overview-search', user?.id, debouncedQuery, typeFilter, effectiveStatusFilter, selectedLocationId, selectedTagsKey],
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

  const allItems = allItemsQuery.data ?? [];
  const itemMap = useMemo(() => new Map(allItems.map((item) => [item.id, item])), [allItems]);
  const availableTags = useMemo(() => buildAvailableTags(allItems), [allItems]);
  const filteredAvailableTags = useMemo(() => {
    const normalizedTagQuery = tagQuery.trim().toLocaleLowerCase('zh-CN');
    return availableTags.filter((tag) => tag.name.toLocaleLowerCase('zh-CN').includes(normalizedTagQuery));
  }, [availableTags, tagQuery]);
  const locations = useMemo(() => allItems.filter(isLocationItem), [allItems]);
  const selectedLocation = selectedLocationId ? itemMap.get(selectedLocationId) ?? null : null;
  const pages = searchQuery.data?.pages ?? [];
  const items = pages.flatMap((page) => page.data);
  const meta = pages[pages.length - 1]?.meta;
  const total = meta?.total ?? items.length;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!searchQuery.hasNextPage || searchQuery.isFetchingNextPage) {
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

  if (allItemsQuery.isError || searchQuery.isError) {
    const error = allItemsQuery.error ?? searchQuery.error;
    return <Screen><StateBlock title="总览加载失败" body={error instanceof Error ? error.message : '请稍后重试'} /></Screen>;
  }

  return (
    <Screen
      scroll
      contentInsetMode="tight"
      chrome="muted"
      contentStyle={screenContentStyle}
      scrollProps={{ onScroll: handleScroll, scrollEventThrottle: 16 }}
    >
      <Text style={pageTitleStyle}>总览</Text>

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

      <View style={filterPanelStyle}>
        <FilterRow label="类型">
          {TYPE_FILTERS.map((option) => (
            <FilterChip
              key={option.value}
              active={typeFilter === option.value}
              icon={option.icon}
              label={option.label}
              onPress={() => handleTypeChange(option.value)}
            />
          ))}
        </FilterRow>
        <FilterRow label="状态">
          {STATUS_FILTERS.map((option) => (
            <FilterChip
              key={option.value}
              active={statusFilter === option.value}
              disabled={typeFilter === 'location' || typeFilter === 'container'}
              label={option.label}
              onPress={() => handleStatusChange(option.value)}
            />
          ))}
        </FilterRow>
        <FilterRow label="范围">
          <FilterChip
            active={Boolean(selectedLocation)}
            icon="git-branch-outline"
            label={selectedLocation?.name ?? '位置树'}
            onPress={() => setIsLocationSheetOpen(true)}
          />
          <FilterChip
            active={selectedTags.length > 0}
            icon="pricetag-outline"
            label={selectedTags.length > 0 ? `标签 · ${selectedTags.length}` : '标签筛选'}
            onPress={() => setIsTagSheetOpen(true)}
          />
        </FilterRow>
      </View>

      <View style={resultDividerStyle} />
      <Text style={resultSummaryStyle}>共 {total} 个结果</Text>

      {searchQuery.isLoading || allItemsQuery.isLoading ? <StateBlock title="搜索中" loading /> : null}
      {!searchQuery.isLoading && items.length === 0 ? <StateBlock title="暂无结果" body="换个关键词试试" /> : null}

      <View style={resultListStyle}>
        {items.map((item) => (
          <ResultRow key={item.id} item={item} path={buildMobileItemPath(item, itemMap)} />
        ))}
      </View>

      {meta ? (
        <Text style={loadedMetaStyle}>
          {searchQuery.hasNextPage ? `已加载 ${items.length} / ${meta.total}，继续上滑加载更多` : `已展示全部 ${meta.total} 个结果`}
        </Text>
      ) : null}

      {searchQuery.isFetchingNextPage ? (
        <View style={loadingMoreStyle}>
          <ActivityIndicator color={palette.brand} />
          <Text style={loadedMetaStyle}>加载更多...</Text>
        </View>
      ) : null}

      <LocationFilterSheet
        visible={isLocationSheetOpen}
        locations={locations}
        itemMap={itemMap}
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
  );
}
