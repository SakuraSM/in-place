import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { Item } from '@inplace/domain';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { InventoryStatsGrid } from '@/shared/ui/InventoryStatsGrid';
import { Entrance } from '@/shared/ui/Entrance';
import { itemsApi } from '@/shared/api/mobileClient';
import { useAuth } from '@/providers/AuthProvider';
import { getContainerTypeLabel } from '@/shared/lib/location';
import { palette, shadows } from '@/shared/ui/theme';

const RECENT_LIMIT = 3;

function formatRecentTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildItemPath(item: Item, itemMap: Map<string, Item>): string {
  const lineage: string[] = [];
  const visited = new Set<string>();
  let parentId: string | null = item.parent_id;
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const ancestor = itemMap.get(parentId);
    if (!ancestor) break;
    lineage.unshift(ancestor.name);
    parentId = ancestor.parent_id;
  }
  return lineage.join(' > ');
}

export default function HomeTab() {
  const { user } = useAuth();

  const statsQuery = useQuery({
    queryKey: ['mobile', 'home-stats', user?.id],
    enabled: Boolean(user),
    queryFn: () => itemsApi.fetchItemStats(user!.id),
  });

  const recentItemsQuery = useQuery({
    queryKey: ['mobile', 'recent-items', user?.id],
    enabled: Boolean(user),
    staleTime: 1000 * 60,
    queryFn: () => itemsApi.searchItems('', user!.id),
  });

  const stats = statsQuery.data ?? null;
  const allItems = recentItemsQuery.data ?? [];
  const itemMap = useMemo(() => new Map(allItems.map((item) => [item.id, item])), [allItems]);
  const recentItems = useMemo(
    () => allItems
      .slice()
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .slice(0, RECENT_LIMIT),
    [allItems],
  );

  if (statsQuery.isError) {
    return (
      <Screen>
        <StateBlock
          title="首页加载失败"
          body={statsQuery.error instanceof Error ? statsQuery.error.message : '请稍后重试。'}
        />
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <Screen scroll contentStyle={styles.screenContent}>
        <BrandHeader title="归位" compact />

        <Entrance offset={12}>
          <View style={[styles.statsCard, shadows.card]}>
            <InventoryStatsGrid
              stats={stats}
              loading={statsQuery.isLoading}
              onNavigate={() => router.push('/(tabs)/overview')}
            />
          </View>
        </Entrance>

        <SectionCard
          title="最近添加"
          subtitle={`仅保留最近 ${RECENT_LIMIT} 条，快速回到刚录入的内容。`}
          delay={120}
        >
          {recentItemsQuery.isLoading ? (
            <Text style={styles.body}>正在加载...</Text>
          ) : recentItems.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>还没有新增内容，点右下角按钮开始整理吧。</Text>
            </View>
          ) : (
            <View style={styles.recentList}>
              {recentItems.map((item) => {
                const path = buildItemPath(item, itemMap);
                return (
                <Link key={item.id} href={`/item/${item.id}`} asChild>
                  <Pressable
                    style={({ pressed }) => [styles.recentRow, pressed && styles.recentRowPressed]}
                  >
                    <View
                      style={[
                        styles.thumb,
                        item.images[0]
                          ? styles.thumbWithImage
                          : item.type === 'item'
                          ? styles.thumbItem
                          : styles.thumbContainer,
                      ]}
                    >
                      {item.images[0] ? (
                        <Image source={{ uri: item.images[0] }} style={styles.thumbImage} />
                      ) : (
                        <Ionicons
                          name={item.type === 'item' ? 'cube-outline' : 'cube'}
                          size={18}
                          color={item.type === 'item' ? '#f59e0b' : '#0ea5e9'}
                        />
                      )}
                    </View>
                    <View style={styles.recentMain}>
                      <Text style={styles.recentTitle} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.recentMeta} numberOfLines={1}>
                        {item.type === 'item' ? '物品' : getContainerTypeLabel(item)} · {formatRecentTime(item.created_at)}
                      </Text>
                      {path ? (
                        <Text style={styles.recentPath} numberOfLines={1}>
                          {path}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                  </Pressable>
                </Link>
                );
              })}
            </View>
          )}
        </SectionCard>
      </Screen>

      <Pressable
        accessibilityLabel="新建物品"
        onPress={() => router.push('/item/form?type=item')}
        style={({ pressed }) => [styles.fab, shadows.card, pressed && styles.fabPressed]}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  screenContent: {
    paddingBottom: 96,
  },
  statsCard: {
    borderRadius: 24,
    backgroundColor: palette.surface,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  body: {
    fontSize: 14,
    color: palette.textSoft,
  },
  empty: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  recentList: {
    gap: 8,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eef2f7',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  recentRowPressed: {
    backgroundColor: '#f8fafc',
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbWithImage: {
    backgroundColor: '#f1f5f9',
  },
  thumbItem: {
    backgroundColor: '#fef3c7',
  },
  thumbContainer: {
    backgroundColor: '#e0f2fe',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  recentMain: {
    flex: 1,
    gap: 2,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
  },
  recentMeta: {
    fontSize: 12,
    color: '#94a3b8',
  },
  recentPath: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
  },
});
