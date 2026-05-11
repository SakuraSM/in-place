import { Link } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { itemsApi } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Entrance } from '@/shared/ui/Entrance';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';
import { resolveMobileDetailHref } from '@/shared/lib/detailPath';
import { buildChildrenMap, countLocationContents, getContainerTypeLabel, isLocationItem } from '@/shared/lib/location';

const PAGE_SIZE = 100;

const LOCATION_STAT_ITEMS = [
  { key: 'locations', label: '位置' },
  { key: 'containers', label: '收纳' },
  { key: 'items', label: '物品' },
  { key: 'total', label: '总数' },
] as const;

export default function LocationsTab() {
  const { user } = useAuth();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const itemsQuery = useInfiniteQuery({
    queryKey: ['mobile', 'locations', user?.id],
    enabled: Boolean(user),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => itemsApi.searchItemsPage('', user!.id, { page: pageParam, pageSize: PAGE_SIZE }),
    getNextPageParam: (lastPage) => (lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined),
  });

  const pages = itemsQuery.data?.pages ?? [];
  const items = pages.flatMap((page) => page.data);
  const meta = pages[pages.length - 1]?.meta;
  const locationItems = useMemo(() => items.filter(isLocationItem), [items]);
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const childrenMap = useMemo(() => buildChildrenMap(items), [items]);
  const selectedLocation = selectedLocationId ? itemMap.get(selectedLocationId) ?? null : null;
  const selectedStats = useMemo(
    () => (selectedLocation ? countLocationContents(items, selectedLocation.id) : null),
    [items, selectedLocation],
  );
  const directChildren = selectedLocation ? childrenMap.get(selectedLocation.id) ?? [] : [];

  useEffect(() => {
    if (locationItems.length === 0) {
      setSelectedLocationId(null);
      return;
    }

    if (!selectedLocationId || !itemMap.has(selectedLocationId) || !isLocationItem(itemMap.get(selectedLocationId))) {
      setSelectedLocationId(locationItems[0]?.id ?? null);
    }
  }, [itemMap, locationItems, selectedLocationId]);

  if (itemsQuery.isLoading) {
    return <Screen><StateBlock title="加载位置" loading /></Screen>;
  }

  if (itemsQuery.isError) {
    return <Screen><StateBlock title="位置加载失败" body={itemsQuery.error instanceof Error ? itemsQuery.error.message : '请稍后重试'} /></Screen>;
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!itemsQuery.hasNextPage || itemsQuery.isFetchingNextPage) {
      return;
    }

    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromBottom < 160) {
      void itemsQuery.fetchNextPage();
    }
  };

  return (
    <Screen
      scroll
      contentInsetMode="page"
      chrome="muted"
      scrollProps={{
        onScroll: handleScroll,
        scrollEventThrottle: 16,
      }}
    >
      <Entrance variant="page">
        <BrandHeader variant="page" title="位置" />
      </Entrance>

      {locationItems.length === 0 ? (
        <SectionCard title="暂无位置" delay={70} density="compact">
          <Text style={bodyStyle}>新建收纳时可标记为位置。</Text>
        </SectionCard>
      ) : (
        <>
          <SectionCard title="位置导航" subtitle={meta ? `${items.length} / ${meta.total}` : undefined} delay={70} density="compact" headerMode="compact">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={locationRailStyle}>
              {locationItems.map((location) => (
                <Pressable
                  key={location.id}
                  onPress={() => setSelectedLocationId(location.id)}
                  style={[chipStyle, selectedLocationId === location.id ? activeChipStyle : null]}
                >
                  <Text style={selectedLocationId === location.id ? activeChipTextStyle : chipTextStyle}>{location.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </SectionCard>

          {selectedLocation ? (
            <>
              <SectionCard title={selectedLocation.name} subtitle={selectedLocation.description || '当前选择的位置'} delay={120}>
                <View style={statsGridStyle}>
                  {LOCATION_STAT_ITEMS.map((stat) => (
                    <View key={stat.key} style={statCardStyle}>
                      <Text style={statValueStyle}>{selectedStats?.[stat.key] ?? 0}</Text>
                      <Text style={captionStyle}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
              </SectionCard>

              <SectionCard title="直接内容" subtitle={`${directChildren.length} 项`} delay={170} density="compact" headerMode="compact">
                {directChildren.length === 0 ? (
                  <Text style={bodyStyle}>这个位置下还没有直接内容。</Text>
                ) : (
                  directChildren.map((child) => <DirectChildRow key={child.id} item={child} />)
                )}
                {itemsQuery.isFetchingNextPage ? (
                  <View style={loadingMoreStyle}>
                    <ActivityIndicator color={palette.brandStrong} />
                    <Text style={captionStyle}>加载中...</Text>
                  </View>
                ) : null}
              </SectionCard>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function DirectChildRow({ item }: { item: Item }) {
  return (
    <Link href={resolveMobileDetailHref(item)} asChild>
      <Pressable style={rowStyle}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={listTitleStyle}>{item.name}</Text>
          <Text style={bodyStyle}>
            {item.type === 'item' ? ITEM_TYPE_PRESENTATION.item.label : getContainerTypeLabel(item)}
            {item.category ? ` · ${item.category}` : ''}
          </Text>
        </View>
        <Text style={captionStyle}>查看详情</Text>
      </Pressable>
    </Link>
  );
}

const bodyStyle = {
  fontSize: 15,
  lineHeight: 22,
  color: palette.textMuted,
};

const captionStyle = {
  fontSize: 13,
  color: palette.textSoft,
};

const locationRailStyle = {
  flexDirection: 'row' as const,
  gap: 8,
  paddingRight: 4,
};

const chipStyle = {
  borderRadius: 999,
  backgroundColor: palette.surfaceMuted,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 14,
  paddingVertical: 9,
};

const activeChipStyle = {
  backgroundColor: palette.brand,
  borderColor: palette.brand,
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

const statsGridStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 12,
};

const statCardStyle = {
  minWidth: '47%' as const,
  backgroundColor: palette.surfaceMuted,
  borderRadius: 16,
  padding: 14,
  gap: 4,
  borderWidth: 1,
  borderColor: palette.borderSoft,
};

const statValueStyle = {
  fontSize: 24,
  fontWeight: '700' as const,
  color: palette.text,
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

const loadingMoreStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 8,
  paddingTop: 10,
};
