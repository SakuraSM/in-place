import { Link, router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { itemsApi } from '@/shared/api/mobileClient';
import { useAuth } from '@/providers/AuthProvider';
import { getContainerTypeLabel } from '@/shared/lib/location';
import { palette } from '@/shared/ui/theme';

const PAGE_SIZE = 20;

export default function HomeTab() {
  const { user } = useAuth();
  const rootItemsQuery = useInfiniteQuery({
    queryKey: ['mobile', 'root-items', user?.id],
    enabled: Boolean(user),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => itemsApi.fetchChildrenPage(null, user!.id, { page: pageParam, pageSize: PAGE_SIZE }),
    getNextPageParam: (lastPage) => (lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined),
  });

  if (rootItemsQuery.isLoading) {
    return <Screen><StateBlock title="正在加载首页" loading body="正在读取根目录下的容器与物品。" /></Screen>;
  }

  if (rootItemsQuery.isError) {
    return <Screen><StateBlock title="首页加载失败" body={rootItemsQuery.error instanceof Error ? rootItemsQuery.error.message : '请稍后重试。'} /></Screen>;
  }

  const pages = rootItemsQuery.data?.pages ?? [];
  const rootItems = pages.flatMap((page) => page.data);
  const meta = pages[pages.length - 1]?.meta;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!rootItemsQuery.hasNextPage || rootItemsQuery.isFetchingNextPage) {
      return;
    }

    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromBottom < 160) {
      void rootItemsQuery.fetchNextPage();
    }
  };

  return (
    <Screen
      scroll
      scrollProps={{
        onScroll: handleScroll,
        scrollEventThrottle: 16,
      }}
    >
      <BrandHeader title="归位" subtitle="让每件物品都有清晰归属，首页结构和 Web 保持同一套信息层次。" />

      <SectionCard title="根目录" subtitle="收纳、位置与物品列表已经接入真实 API。" delay={80}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={() => router.push('/item/form?type=container')} style={secondaryButtonStyle}>
            <Text style={secondaryButtonTextStyle}>新建容器</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/item/form?type=item')} style={primaryButtonStyle}>
            <Text style={primaryButtonTextStyle}>新建物品</Text>
          </Pressable>
        </View>
        {rootItems.length === 0 ? (
          <Text style={bodyStyle}>根目录还没有内容，后续第二阶段可以补创建入口。</Text>
        ) : (
          <>
            {rootItems.map((item) => (
              <Link key={item.id} href={`/item/${item.id}`} asChild>
                <Pressable style={listRowStyle}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={listTitleStyle}>{item.name}</Text>
                    <Text style={bodyStyle}>
                      {item.type === 'container' ? getContainerTypeLabel(item) : '物品'}{item.category ? ` · ${item.category}` : ''}
                    </Text>
                  </View>
                  <Text style={metaStyle}>{item.status}</Text>
                </Pressable>
              </Link>
            ))}
          </>
        )}
        {meta ? (
          <Text style={metaCaptionStyle}>
            已加载 {rootItems.length} / {meta.total} 项
            {rootItemsQuery.hasNextPage ? '，继续上滑加载更多' : '，已全部加载完成'}
          </Text>
        ) : null}
        {rootItemsQuery.isFetchingNextPage ? (
          <View style={loadingMoreStyle}>
            <ActivityIndicator color="#0ea5e9" />
            <Text style={metaCaptionStyle}>正在加载更多...</Text>
          </View>
        ) : null}
      </SectionCard>
    </Screen>
  );
}

const bodyStyle = {
  fontSize: 15,
  lineHeight: 22,
  color: palette.textMuted,
};

const listRowStyle = {
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

const metaStyle = {
  fontSize: 12,
  color: palette.textSoft,
};

const metaCaptionStyle = {
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

const secondaryButtonStyle = {
  flex: 1,
  borderRadius: 16,
  backgroundColor: palette.surface,
  borderWidth: 1,
  borderColor: palette.border,
  paddingVertical: 14,
  alignItems: 'center' as const,
};

const secondaryButtonTextStyle = {
  color: palette.text,
  fontSize: 15,
  fontWeight: '600' as const,
};

const primaryButtonStyle = {
  flex: 1,
  borderRadius: 16,
  backgroundColor: palette.brand,
  paddingVertical: 14,
  alignItems: 'center' as const,
};

const primaryButtonTextStyle = {
  color: '#ffffff',
  fontSize: 15,
  fontWeight: '600' as const,
};
