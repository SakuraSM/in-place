import { Link } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { ActivityAction, ActivityLog } from '@inplace/domain';
import { ACTIVITY_ACTION_PRESENTATION, ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { activityApi } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
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
    return <Screen><StateBlock title="正在加载操作记录" loading body="正在读取手动录入、AI 录入、修改和删除记录。" /></Screen>;
  }

  if (activityQuery.isError) {
    return <Screen><StateBlock title="操作记录加载失败" body={activityQuery.error instanceof Error ? activityQuery.error.message : '请稍后重试。'} /></Screen>;
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
      scrollProps={{
        onScroll: handleScroll,
        scrollEventThrottle: 16,
      }}
    >
      <BrandHeader compact title="操作记录" subtitle="与 Web 端操作记录一致，汇总手动录入、AI 录入、修改和删除。" />

      <SectionCard title="记录概览" subtitle="当前已加载记录的动作统计。" delay={70}>
        <View style={statsGridStyle}>
          {(Object.keys(ACTIVITY_ACTION_PRESENTATION) as ActivityAction[]).map((action) => (
            <View key={action} style={statCardStyle}>
              <Text style={statValueStyle}>{summary[action]}</Text>
              <Text style={bodyStyle}>{ACTIVITY_ACTION_PRESENTATION[action].label}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="操作记录" subtitle={meta ? `已加载 ${logs.length} / ${meta.total}` : '按时间倒序展示'} delay={140}>
        {logs.length === 0 ? (
          <Text style={bodyStyle}>还没有操作记录。</Text>
        ) : (
          logs.map((entry) => <ActivityRow key={entry.id} entry={entry} />)
        )}
        {activityQuery.isFetchingNextPage ? (
          <View style={loadingMoreStyle}>
            <ActivityIndicator color="#0ea5e9" />
            <Text style={captionStyle}>正在加载更多记录...</Text>
          </View>
        ) : meta ? (
          <Text style={captionStyle}>
            {activityQuery.hasNextPage ? '继续上滑加载更多' : `已展示全部 ${meta.total} 条记录`}
          </Text>
        ) : null}
      </SectionCard>
    </Screen>
  );
}

function ActivityRow({ entry }: { entry: ActivityLog }) {
  const content = (
    <View style={rowStyle}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={listTitleStyle}>{entry.item_name || '未命名对象'}</Text>
        <Text style={bodyStyle}>
          {ACTIVITY_ACTION_PRESENTATION[entry.action].label} · {ITEM_TYPE_PRESENTATION[entry.item_type].label}
        </Text>
        <Text style={captionStyle}>
          {new Date(entry.created_at).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      <Text style={captionStyle}>{entry.item_id ? '查看' : '—'}</Text>
    </View>
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

const loadingMoreStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
  justifyContent: 'center' as const,
  paddingTop: 12,
};
