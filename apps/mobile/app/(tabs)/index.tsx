import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Item } from '@inplace/domain';
import { activityApi, categoriesApi, itemsApi } from '@/shared/api/mobileClient';
import { Screen } from '@/shared/ui/Screen';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette, shadows } from '@/shared/ui/theme';
import { buildChildrenMap } from '@/shared/lib/location';
import { useAuth } from '@/providers/AuthProvider';
import { HomeDashboard } from '@/features/home/HomeDashboard';
import { HomeItemFormSheet } from '@/features/home/HomeItemFormSheet';
import { HomeBulkEditSheet, type BulkEditPayload } from '@/features/home/HomeBulkEditSheet';

type ViewMode = 'type' | 'category';

const ROOT_PAGE_SIZE = 100;
const ALL_ITEMS_PAGE_SIZE = 100;
const ALL_ITEMS_MAX_PAGES = 20;
const RECENT_ACTIVITY_PAGE_SIZE = 3;
const FLOATING_ACTION_BUTTON_SIZE = 56;
const FLOATING_ACTION_BUTTON_ICON_SIZE = 28;
const FLOATING_ACTION_BUTTON_RIGHT = 20;
const FLOATING_ACTION_BUTTON_BOTTOM_OFFSET = 20;

export default function HomeTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<ViewMode>('category');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  const rootItemsQuery = useQuery({
    queryKey: ['mobile', 'home-root-items', user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchAllRootItems(user!.id),
  });

  const allItemsQuery = useQuery({
    queryKey: ['mobile', 'home-all-items', user?.id],
    enabled: Boolean(user),
    staleTime: 1000 * 60,
    queryFn: () => fetchAllHomeItems(user!.id),
  });

  const statsQuery = useQuery({
    queryKey: ['mobile', 'home-stats', user?.id],
    enabled: Boolean(user),
    staleTime: 1000 * 60,
    queryFn: () => itemsApi.fetchItemStats(user!.id),
  });

  const recentActivityQuery = useQuery({
    queryKey: ['mobile', 'home-recent-activity', user?.id],
    enabled: Boolean(user),
    staleTime: 1000 * 30,
    queryFn: async () => {
      const response = await activityApi.fetchActivityLogsPage(user!.id, { page: 1, pageSize: RECENT_ACTIVITY_PAGE_SIZE });
      return response.data;
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ['mobile', 'home-categories', user?.id],
    enabled: Boolean(user),
    staleTime: 1000 * 60,
    queryFn: () => categoriesApi.fetchCategories(user!.id),
  });

  const allItems = allItemsQuery.data ?? [];
  const recentItems = useMemo(
    () => [...allItems]
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .slice(0, 3),
    [allItems],
  );
  const recentItemPaths = useMemo(() => buildRecentItemPaths(recentItems, allItems), [allItems, recentItems]);
  const selectedItems = useMemo(
    () => (rootItemsQuery.data ?? []).filter((item) => selectedIds.includes(item.id)),
    [rootItemsQuery.data, selectedIds],
  );

  if (rootItemsQuery.isLoading) {
    return <Screen><StateBlock title="加载首页" loading /></Screen>;
  }

  if (rootItemsQuery.isError || allItemsQuery.isError || statsQuery.isError || recentActivityQuery.isError || categoriesQuery.isError) {
    const error = rootItemsQuery.error ?? allItemsQuery.error ?? statsQuery.error ?? recentActivityQuery.error ?? categoriesQuery.error;
    return <Screen><StateBlock title="首页加载失败" body={error instanceof Error ? error.message : '请稍后重试'} /></Screen>;
  }

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
    await queryClient.invalidateQueries({ queryKey: ['mobile'] });
    setIsBulkEditOpen(false);
    setSelectedIds([]);
    setSelectionMode(false);
  };

  return (
    <View style={screenRootStyle}>
      <Screen scroll contentInsetMode="page" chrome="muted" contentStyle={{ paddingBottom: 112 }}>
        <HomeDashboard
          stats={statsQuery.data ?? null}
          statsLoading={statsQuery.isLoading}
          recentItems={recentItems}
          recentItemPaths={recentItemPaths}
          recentActivity={recentActivityQuery.data ?? []}
          rootItems={rootItemsQuery.data ?? []}
          allItems={allItems}
          categories={categoriesQuery.data ?? []}
          viewMode={viewMode}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelectionMode={handleToggleSelectionMode}
          onChangeViewMode={setViewMode}
          onToggleSelected={handleToggleSelected}
        />
      </Screen>
      {!selectionMode ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="新增物品"
          hitSlop={8}
          onPress={() => setIsAddSheetOpen(true)}
          style={[floatingButtonStyle, { bottom: Math.max(insets.bottom, 10) + FLOATING_ACTION_BUTTON_BOTTOM_OFFSET }]}
        >
          <Ionicons name="add" size={FLOATING_ACTION_BUTTON_ICON_SIZE} color="#ffffff" />
        </Pressable>
      ) : null}
      {selectionMode && selectedIds.length > 0 ? (
        <View style={[bulkActionBarStyle, { bottom: Math.max(insets.bottom, 10) + 14 }]}>
          <View style={bulkActionHeaderStyle}>
            <Text style={bulkActionTitleStyle}>已选择 {selectedIds.length} 项</Text>
          </View>
          <View style={bulkActionGridStyle}>
            <Pressable onPress={() => setIsBulkEditOpen(true)} style={bulkEditButtonStyle}>
              <Ionicons name="create-outline" size={16} color="#ffffff" />
              <Text style={bulkEditButtonTextStyle}>批量编辑</Text>
            </Pressable>
            <Pressable style={bulkDeleteButtonStyle}>
              <Ionicons name="trash-outline" size={16} color={palette.danger} />
              <Text style={bulkDeleteButtonTextStyle}>批量删除</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <HomeItemFormSheet visible={isAddSheetOpen} onClose={() => setIsAddSheetOpen(false)} />
      <HomeBulkEditSheet
        visible={isBulkEditOpen}
        items={selectedItems}
        allItems={allItems}
        categories={categoriesQuery.data ?? []}
        onClose={() => setIsBulkEditOpen(false)}
        onSave={handleBulkSave}
      />
    </View>
  );
}

async function fetchAllRootItems(userId: string) {
  const collectedItems: Item[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && page <= ALL_ITEMS_MAX_PAGES) {
    const response = await itemsApi.fetchChildrenPage(null, userId, { page, pageSize: ROOT_PAGE_SIZE });
    collectedItems.push(...response.data);
    hasNextPage = response.meta.hasNextPage;
    page += 1;
  }

  return collectedItems;
}

async function fetchAllHomeItems(userId: string) {
  const collectedItems: Item[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && page <= ALL_ITEMS_MAX_PAGES) {
    const response = await itemsApi.searchItemsPage('', userId, { page, pageSize: ALL_ITEMS_PAGE_SIZE });
    collectedItems.push(...response.data);
    hasNextPage = response.meta.hasNextPage;
    page += 1;
  }

  return collectedItems;
}

function buildRecentItemPaths(recentItems: Item[], allItems: Item[]) {
  const childrenMap = buildChildrenMap(allItems);
  const itemMap = new Map(allItems.map((item) => [item.id, item]));
  const rootIds = new Set((childrenMap.get(null) ?? []).map((item) => item.id));

  return Object.fromEntries(
    recentItems.map((item) => {
      const lineage: string[] = [];
      let parentId = item.parent_id;

      while (parentId) {
        const parent = itemMap.get(parentId);
        if (!parent) {
          break;
        }

        lineage.unshift(parent.name);
        if (rootIds.has(parent.id)) {
          break;
        }

        parentId = parent.parent_id;
      }

      return [item.id, lineage.length > 0 ? lineage.join(' > ') : '顶层'];
    }),
  );
}

const screenRootStyle = {
  flex: 1,
};

const floatingButtonStyle = {
  position: 'absolute' as const,
  right: FLOATING_ACTION_BUTTON_RIGHT,
  width: FLOATING_ACTION_BUTTON_SIZE,
  height: FLOATING_ACTION_BUTTON_SIZE,
  borderRadius: 999,
  backgroundColor: palette.brand,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  ...shadows.lg,
};

const bulkActionBarStyle = {
  position: 'absolute' as const,
  left: 16,
  right: 16,
  borderRadius: 24,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  padding: 12,
  ...shadows.lg,
};

const bulkActionHeaderStyle = {
  paddingHorizontal: 4,
  paddingBottom: 10,
};

const bulkActionTitleStyle = {
  fontSize: 14,
  fontWeight: '800' as const,
  color: palette.text,
};

const bulkActionGridStyle = {
  flexDirection: 'row' as const,
  gap: 10,
};

const bulkEditButtonStyle = {
  flex: 1,
  minHeight: 46,
  borderRadius: 16,
  backgroundColor: palette.brand,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 6,
};

const bulkEditButtonTextStyle = {
  fontSize: 14,
  fontWeight: '800' as const,
  color: '#ffffff',
};

const bulkDeleteButtonStyle = {
  flex: 1,
  minHeight: 46,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#fecdd3',
  backgroundColor: '#fff1f2',
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 6,
};

const bulkDeleteButtonTextStyle = {
  fontSize: 14,
  fontWeight: '800' as const,
  color: palette.danger,
};
