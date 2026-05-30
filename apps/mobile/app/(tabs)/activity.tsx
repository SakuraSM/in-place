import { Link } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { ActivityAction, ActivityLog } from '@inplace/domain';
import { ACTIVITY_ACTION_PRESENTATION, ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { activityApi } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Entrance } from '@/shared/ui/Entrance';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { CompactListRow } from '@/shared/ui/CompactListRow';
import { MetricGrid } from '@/shared/ui/MetricGrid';
import { StateBlock } from '@/shared/ui/StateBlock';
import { resolveMobileDetailHref } from '@/shared/lib/detailPath';
import { palette } from '@/shared/ui/theme';

const PAGE_SIZE = 20;

function createEmptyActionSummary() {
  return Object.fromEntries(
    (Object.keys(ACTIVITY_ACTION_PRESENTATION) as ActivityAction[]).map((action) => [action, 0]),
  ) as Record<ActivityAction, number>;
}

export default function ActivityTab() {
  const { user } = useAuth();
  const activityQuery = useInfiniteQuery({
    queryKey: ['mobile', 'activity', user?.id],
    enabled: Boolean(user),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => activityApi.fetchActivityLogsPage(user!.id, { page: pageParam, pageSize: PAGE_SIZE }),
    getNextPageParam: (lastPage) => (lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined),
  });

  if (activityQuery.isLoading) {
    return <Screen><StateBlock title="加载记录" loading /></Screen>;
  }

  if (activityQuery.isError) {
    return <Screen><StateBlock title="记录加载失败" body={activityQuery.error instanceof Error ? activityQuery.error.message : '请稍后重试'} /></Screen>;
  }

  const pages = activityQuery.data?.pages ?? [];
  const logs = pages.flatMap((page) => page.data);
  const meta = pages[pages.length - 1]?.meta;
  const summary = logs.reduce<Record<ActivityAction, number>>((acc, entry) => {
    acc[entry.action] += 1;
    return acc;
  }, createEmptyActionSummary());

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!activityQuery.hasNextPage || activityQuery.isFetchingNextPage) {
      return;
    }

    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromBottom < 160) {
      void activityQuery.fetchNextPage();
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
        <BrandHeader variant="page" title="记录" />
      </Entrance>

      <SectionCard title="概览" subtitle={meta ? `${logs.length} / ${meta.total}` : undefined} delay={70} density="dense" headerMode="compact">
        <MetricGrid
          columns={4}
          dense
          items={(Object.keys(ACTIVITY_ACTION_PRESENTATION) as ActivityAction[]).map((action) => ({
            key: action,
            label: ACTIVITY_ACTION_PRESENTATION[action].label,
            value: summary[action],
          }))}
        />
      </SectionCard>

      <SectionCard title="最近操作" delay={140} density="dense" headerMode="compact">
        {logs.length === 0 ? (
          <Text style={bodyStyle}>暂无记录</Text>
        ) : (
          logs.map((entry) => <ActivityRow key={entry.id} entry={entry} />)
        )}
        {activityQuery.isFetchingNextPage ? (
          <View style={loadingMoreStyle}>
            <ActivityIndicator color={palette.brandStrong} />
            <Text style={captionStyle}>加载更多...</Text>
          </View>
        ) : meta ? (
          <Text style={captionStyle}>
            {activityQuery.hasNextPage ? '上滑加载' : `共 ${meta.total} 条`}
          </Text>
        ) : null}
      </SectionCard>
    </Screen>
  );
}

function ActivityRow({ entry }: { entry: ActivityLog }) {
  const content = (
    <CompactListRow
      title={entry.item_name || '未命名对象'}
      subtitle={`${ACTIVITY_ACTION_PRESENTATION[entry.action].label} · ${ITEM_TYPE_PRESENTATION[entry.item_type].label}`}
      caption={new Date(entry.created_at).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })}
      meta={entry.item_id ? '查看' : '—'}
      chevron={Boolean(entry.item_id)}
    />
  );

  if (!entry.item_id) {
    return content;
  }

  return (
    <Link href={resolveMobileDetailHref({ id: entry.item_id, type: entry.item_type })} asChild>
      <Pressable>{content}</Pressable>
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

const loadingMoreStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
  justifyContent: 'center' as const,
  paddingTop: 12,
};
