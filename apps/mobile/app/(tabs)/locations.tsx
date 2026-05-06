import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { itemsApi } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';
import { buildChildrenMap, countLocationContents, getContainerTypeLabel, isLocationItem } from '@/shared/lib/location';

const PAGE_SIZE = 200;

export default function LocationsTab() {
  const { user } = useAuth();
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const itemsQuery = useQuery({
    queryKey: ['mobile', 'locations', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const response = await itemsApi.searchItemsPage('', user!.id, { page: 1, pageSize: PAGE_SIZE });
      return response.data;
    },
  });

  const items = itemsQuery.data ?? [];
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
    return <Screen><StateBlock title="正在加载位置树" loading body="正在读取位置、收纳和物品层级。" /></Screen>;
  }

  if (itemsQuery.isError) {
    return <Screen><StateBlock title="位置树加载失败" body={itemsQuery.error instanceof Error ? itemsQuery.error.message : '请稍后重试。'} /></Screen>;
  }

  return (
    <Screen scroll>
      <BrandHeader compact title="位置树" subtitle="与 Web 端位置树保持一致，查看位置导航、当前位置、统计和直接内容。" />

      {locationItems.length === 0 ? (
        <SectionCard title="还没有可展示的位置" subtitle="在 Web 端或后续移动端位置表单中标记位置后会显示在这里。" delay={70}>
          <Text style={bodyStyle}>位置是带有位置标记的容器，用于承载空间、房间或区域层级。</Text>
        </SectionCard>
      ) : (
        <>
          <SectionCard title="位置导航" subtitle="选择一个位置，右侧信息在移动端折叠为下方卡片。" delay={70}>
            <View style={chipWrapStyle}>
              {locationItems.map((location) => (
                <Pressable
                  key={location.id}
                  onPress={() => setSelectedLocationId(location.id)}
                  style={[chipStyle, selectedLocationId === location.id ? activeChipStyle : null]}
                >
                  <Text style={selectedLocationId === location.id ? activeChipTextStyle : chipTextStyle}>{location.name}</Text>
                </Pressable>
              ))}
            </View>
          </SectionCard>

          {selectedLocation ? (
            <>
              <SectionCard title="当前位置" subtitle={selectedLocation.name} delay={120}>
                {selectedLocation.description ? <Text style={bodyStyle}>{selectedLocation.description}</Text> : null}
                <View style={statsGridStyle}>
                  {[
                    { label: '下级位置', value: selectedStats?.locations ?? 0 },
                    { label: '下级收纳', value: selectedStats?.containers ?? 0 },
                    { label: '下级物品', value: selectedStats?.items ?? 0 },
                    { label: '内容总数', value: selectedStats?.total ?? 0 },
                  ].map((stat) => (
                    <View key={stat.label} style={statCardStyle}>
                      <Text style={statValueStyle}>{stat.value}</Text>
                      <Text style={captionStyle}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
              </SectionCard>

              <SectionCard title="直接内容" subtitle={`${directChildren.length} 项`} delay={170}>
                {directChildren.length === 0 ? (
                  <Text style={bodyStyle}>这个位置下还没有直接内容。</Text>
                ) : (
                  directChildren.map((child) => <DirectChildRow key={child.id} item={child} />)
                )}
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
    <Link href={`/item/${item.id}`} asChild>
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
  backgroundColor: palette.brandTint,
  borderColor: '#7dd3fc',
};

const chipTextStyle = {
  color: palette.textMuted,
  fontSize: 13,
  fontWeight: '500' as const,
};

const activeChipTextStyle = {
  color: palette.brandStrong,
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
  borderRadius: 18,
  padding: 16,
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
