import { Link } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import type { ItemStatus, ItemType } from '@inplace/domain';
import { ITEM_STATUS_PRESENTATION, ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { itemsApi, tagsApi } from '@/shared/api/mobileClient';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { resolveMobileDetailHref } from '@/shared/lib/detailPath';
import { getContainerTypeLabel } from '@/shared/lib/location';
import { palette } from '@/shared/ui/theme';

const PAGE_SIZE = 20;
type TypeFilterValue = ItemType | 'all' | 'location';

const TYPE_FILTERS: { value: TypeFilterValue; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'location', label: '位置' },
  { value: 'container', label: ITEM_TYPE_PRESENTATION.container.label },
  { value: 'item', label: ITEM_TYPE_PRESENTATION.item.label },
];

const STATUS_FILTERS: { value: ItemStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'in_stock', label: ITEM_STATUS_PRESENTATION.in_stock.label },
  { value: 'borrowed', label: ITEM_STATUS_PRESENTATION.borrowed.label },
  { value: 'worn_out', label: ITEM_STATUS_PRESENTATION.worn_out.label },
];

function resolveEffectiveTypeFilter(typeFilter: TypeFilterValue) {
  if (typeFilter === 'location') {
    return 'container';
  }

  if (typeFilter === 'all') {
    return undefined;
  }

  return typeFilter;
}

function resolveEffectiveStatusFilter(typeFilter: TypeFilterValue, statusFilter: ItemStatus | 'all') {
  if (typeFilter === 'location' || typeFilter === 'container' || statusFilter === 'all') {
    return undefined;
  }

  return statusFilter;
}

export default function OverviewTab() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>('all');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const debouncedQuery = useDebouncedValue(query, 250);
  const effectiveTypeFilter = resolveEffectiveTypeFilter(typeFilter);
  const effectiveStatusFilter = resolveEffectiveStatusFilter(typeFilter, statusFilter);
  const selectedTagsKey = selectedTags.join('\u0000');
  const tagsQuery = useQuery({
    queryKey: ['mobile', 'overview-tags', user?.id],
    enabled: Boolean(user),
    queryFn: () => tagsApi.fetchTags(user!.id),
  });
  const searchQuery = useInfiniteQuery({
    queryKey: ['mobile', 'search-items', user?.id, debouncedQuery, typeFilter, effectiveStatusFilter, selectedTagsKey],
    enabled: Boolean(user),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => itemsApi.searchItemsPage(debouncedQuery, user!.id, {
      page: pageParam,
      pageSize: PAGE_SIZE,
      type: effectiveTypeFilter,
      status: effectiveStatusFilter,
      locationOnly: typeFilter === 'location',
      tags: selectedTags,
    }),
    getNextPageParam: (lastPage) => (lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined),
  });

  const pages = searchQuery.data?.pages ?? [];
  const items = pages.flatMap((page) => page.data);
  const meta = pages[pages.length - 1]?.meta;
  const tags = useMemo(
    () => [...(tagsQuery.data ?? [])].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN')),
    [tagsQuery.data],
  );

  const toggleTag = (tagName: string) => {
    setSelectedTags((current) => (
      current.includes(tagName)
        ? current.filter((value) => value !== tagName)
        : [...current, tagName]
    ));
  };

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

  if (tagsQuery.isError || searchQuery.isError) {
    const error = tagsQuery.error ?? searchQuery.error;
    return <Screen><StateBlock title="总览加载失败" body={error instanceof Error ? error.message : '请稍后重试。'} /></Screen>;
  }

  return (
    <Screen
      scroll
      scrollProps={{
        onScroll: handleScroll,
        scrollEventThrottle: 16,
      }}
    >
      <BrandHeader compact title="总览" subtitle="搜索收纳、位置、物品名称、描述或标签，筛选项与 Web 端保持一致。" />

      <SectionCard title="检索空间" subtitle="支持类型、状态、标签筛选，并向下滚动继续加载。" delay={70}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="搜索收纳、位置、物品名称、描述或标签..."
          style={inputStyle}
        />

        <View style={filterGroupStyle}>
          <Text style={filterLabelStyle}>类型</Text>
          <View style={chipWrapStyle}>
            {TYPE_FILTERS.map(({ value, label }) => (
              <Pressable
                key={value}
                onPress={() => {
                  setTypeFilter(value);
                  if (value === 'location' || value === 'container') {
                    setStatusFilter('all');
                  }
                }}
                style={[chipStyle, typeFilter === value ? activeChipStyle : null]}
              >
                <Text style={typeFilter === value ? activeChipTextStyle : chipTextStyle}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={filterGroupStyle}>
          <Text style={filterLabelStyle}>状态</Text>
          <View style={chipWrapStyle}>
            {STATUS_FILTERS.map(({ value, label }) => {
              const disabled = typeFilter === 'location' || typeFilter === 'container';
              return (
                <Pressable
                  key={value}
                  disabled={disabled}
                  onPress={() => setStatusFilter(value)}
                  style={[chipStyle, statusFilter === value ? activeChipStyle : null, disabled ? disabledChipStyle : null]}
                >
                  <Text style={statusFilter === value ? activeChipTextStyle : chipTextStyle}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={filterGroupStyle}>
          <Text style={filterLabelStyle}>标签</Text>
          {tagsQuery.isLoading ? (
            <Text style={bodyStyle}>正在加载标签筛选...</Text>
          ) : (
            <View style={chipWrapStyle}>
              <Pressable
                onPress={() => setSelectedTags([])}
                style={[chipStyle, selectedTags.length === 0 ? activeChipStyle : null]}
              >
                <Text style={selectedTags.length === 0 ? activeChipTextStyle : chipTextStyle}>全部</Text>
              </Pressable>
              {tags.map((tag) => {
                const active = selectedTags.includes(tag.name);
                return (
                  <Pressable
                    key={tag.id}
                    onPress={() => toggleTag(tag.name)}
                    style={[chipStyle, active ? activeChipStyle : null]}
                  >
                    <Text style={active ? activeChipTextStyle : chipTextStyle}>{tag.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {searchQuery.isLoading ? <StateBlock title="正在搜索" loading body="第一次进入会拉取默认总览结果。" /> : null}

        {!searchQuery.isLoading && items.length === 0 ? (
          <Text style={bodyStyle}>当前没有匹配结果。</Text>
        ) : null}

        {!searchQuery.isLoading && items.length > 0
          ? <>
              {items.map((item) => (
                <Link key={item.id} href={resolveMobileDetailHref(item)} asChild>
                  <Pressable style={rowStyle}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={listTitleStyle}>{item.name}</Text>
                      <Text style={bodyStyle}>
                        {item.type === 'container' ? getContainerTypeLabel(item) : ITEM_TYPE_PRESENTATION.item.label}{item.category ? ` · ${item.category}` : ''}
                      </Text>
                    </View>
                    <StatusBadge status={item.status} />
                  </Pressable>
                </Link>
              ))}
            </>
          : null}

        {meta ? (
          <Text style={resultMetaStyle}>
            已加载 {items.length} / {meta.total} 项
            {searchQuery.hasNextPage ? '，继续上滑加载更多' : '，结果已全部展示'}
          </Text>
        ) : null}

        {searchQuery.isFetchingNextPage ? (
          <View style={loadingMoreStyle}>
            <ActivityIndicator color="#0ea5e9" />
            <Text style={resultMetaStyle}>正在加载更多...</Text>
          </View>
        ) : null}
      </SectionCard>
    </Screen>
  );
}

const inputStyle = {
  backgroundColor: palette.surfaceMuted,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 16,
  paddingVertical: 14,
  color: palette.text,
};

const filterGroupStyle = {
  gap: 8,
};

const filterLabelStyle = {
  color: palette.textSoft,
  fontSize: 12,
  fontWeight: '700' as const,
};

const chipWrapStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 8,
};

const chipStyle = {
  borderRadius: 999,
  backgroundColor: palette.surfaceMuted,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 12,
  paddingVertical: 8,
};

const activeChipStyle = {
  backgroundColor: palette.brand,
  borderColor: palette.brand,
};

const disabledChipStyle = {
  opacity: 0.45,
};

const chipTextStyle = {
  color: palette.textMuted,
  fontSize: 13,
  fontWeight: '500' as const,
};

const activeChipTextStyle = {
  color: '#ffffff',
  fontSize: 13,
  fontWeight: '600' as const,
};

const bodyStyle = {
  fontSize: 15,
  lineHeight: 22,
  color: palette.textMuted,
};

const rowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 12,
  borderTopWidth: 1,
  borderTopColor: palette.borderSoft,
  paddingTop: 14,
};

const listTitleStyle = {
  fontSize: 16,
  fontWeight: '700' as const,
  color: palette.text,
};

const resultMetaStyle = {
  fontSize: 13,
  color: palette.textSoft,
  paddingTop: 8,
};

const loadingMoreStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
  justifyContent: 'center' as const,
  paddingTop: 12,
};
