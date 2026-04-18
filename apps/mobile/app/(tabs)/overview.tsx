import { Link } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { itemsApi } from '@/shared/api/mobileClient';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette } from '@/shared/ui/theme';

const PAGE_SIZE = 20;

export default function OverviewTab() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const searchQuery = useInfiniteQuery({
    queryKey: ['mobile', 'search-items', user?.id, debouncedQuery],
    enabled: Boolean(user),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => itemsApi.searchItemsPage(debouncedQuery, user!.id, { page: pageParam, pageSize: PAGE_SIZE }),
    getNextPageParam: (lastPage) => (lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined),
  });

  const pages = searchQuery.data?.pages ?? [];
  const items = pages.flatMap((page) => page.data);
  const meta = pages[pages.length - 1]?.meta;

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

  return (
    <Screen
      scroll
      scrollProps={{
        onScroll: handleScroll,
        scrollEventThrottle: 16,
      }}
    >
      <BrandHeader compact title="总览" subtitle="搜索、分页和列表节奏向 Web 版对齐。" />

      <SectionCard title="检索空间" subtitle="支持搜索名称、描述和标签，并向下滚动继续加载。" delay={70}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="搜索物品名称、描述、标签"
          style={inputStyle}
        />

        {searchQuery.isLoading ? <StateBlock title="正在搜索" loading body="第一次进入会拉取默认总览结果。" /> : null}

        {!searchQuery.isLoading && items.length === 0 ? (
          <Text style={bodyStyle}>当前没有匹配结果。</Text>
        ) : null}

        {!searchQuery.isLoading && items.length > 0
          ? <>
              {items.map((item) => (
                <Link key={item.id} href={`/item/${item.id}`} asChild>
                  <Pressable style={rowStyle}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={listTitleStyle}>{item.name}</Text>
                      <Text style={bodyStyle}>
                        {item.type === 'container' ? '容器' : '物品'}{item.category ? ` · ${item.category}` : ''}
                      </Text>
                    </View>
                    <Text style={metaStyle}>{item.status}</Text>
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

const metaStyle = {
  fontSize: 12,
  color: palette.textSoft,
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
