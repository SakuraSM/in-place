import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Item } from '@inplace/domain';
import { activityApi, categoriesApi, itemsApi } from '@/shared/api/mobileClient';
import { BulkActionBar } from '@/shared/ui/BulkActionBar';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Screen } from '@/shared/ui/Screen';
import { StateBlock } from '@/shared/ui/StateBlock';
import { palette, shadows } from '@/shared/ui/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useHousehold } from '@/providers/HouseholdProvider';
import { HomeDashboard } from '@/features/home/HomeDashboard';
import { useInventoryBatch } from '@/features/inventory/useInventoryBatch';
import { HomeItemFormSheet } from '@/features/home/HomeItemFormSheet';
import { HomeBulkEditSheet, type BulkEditPayload } from '@/features/home/HomeBulkEditSheet';

type ViewMode = 'type' | 'category';

const RECENT_ACTIVITY_PAGE_SIZE = 3;
const FLOATING_ACTION_BUTTON_SIZE = 56;
const FLOATING_ACTION_BUTTON_ICON_SIZE = 28;
const FLOATING_ACTION_BUTTON_RIGHT = 20;
const FLOATING_ACTION_BUTTON_BOTTOM_OFFSET = 20;
const WELCOME_SCROLL_THRESHOLD = 180;

export default function HomeTab() {
  const { user } = useAuth();
  const { currentHouseholdId, canEditInventory } = useHousehold();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<ViewMode>('type');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isFloatingAddVisible, setIsFloatingAddVisible] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const batch = useInventoryBatch({
    setSelectedIds,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['mobile'] }),
  });

  const allItemsQuery = useQuery({
    queryKey: ['mobile', 'home-all-items', currentHouseholdId, user?.id],
    enabled: Boolean(user && currentHouseholdId),
    staleTime: 1000 * 60,
    queryFn: () => itemsApi.searchItems('', user!.id),
  });

  const statsQuery = useQuery({
    queryKey: ['mobile', 'home-stats', currentHouseholdId, user?.id],
    enabled: Boolean(user && currentHouseholdId),
    staleTime: 1000 * 60,
    queryFn: () => itemsApi.fetchItemStats(user!.id),
  });

  const recentActivityQuery = useQuery({
    queryKey: ['mobile', 'home-recent-activity', currentHouseholdId, user?.id],
    enabled: Boolean(user && currentHouseholdId),
    staleTime: 1000 * 30,
    queryFn: async () => {
      const response = await activityApi.fetchActivityLogsPage(user!.id, { page: 1, pageSize: RECENT_ACTIVITY_PAGE_SIZE });
      return response.data;
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ['mobile', 'home-categories', currentHouseholdId, user?.id],
    enabled: Boolean(user && currentHouseholdId),
    staleTime: 1000 * 60,
    queryFn: () => categoriesApi.fetchCategories(user!.id),
  });

  const allItems = useMemo(() => allItemsQuery.data ?? [], [allItemsQuery.data]);
  const rootItems = useMemo(() => allItems.filter((item) => !item.parent_id), [allItems]);
  const recentItems = useMemo(
    () => [...allItems]
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .slice(0, 3),
    [allItems],
  );
  const recentItemPaths = useMemo(() => buildRecentItemPaths(recentItems, allItems), [allItems, recentItems]);
  const selectedItems = useMemo(
    () => rootItems.filter((item) => selectedIds.includes(item.id)),
    [rootItems, selectedIds],
  );

  if (allItemsQuery.isLoading) {
    return <Screen><StateBlock title="加载首页" loading /></Screen>;
  }

  if (allItemsQuery.isError) {
    return <Screen><StateBlock title="首页加载失败" body={allItemsQuery.error instanceof Error ? allItemsQuery.error.message : '请稍后重试'} /><Pressable accessibilityRole="button" onPress={() => void allItemsQuery.refetch()} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: palette.brandStrong }}>重试</Text></Pressable></Screen>;
  }
  const hasAuxiliaryError = statsQuery.isError || recentActivityQuery.isError || categoriesQuery.isError;

  const handleToggleSelectionMode = () => {
    if (!canEditInventory) return;
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
    await batch.run({
      execute: () => itemsApi.updateItemsBatch(selectedIds, payload),
      onSuccess: () => {
        setIsBulkEditOpen(false);
        setSelectedIds([]);
        setSelectionMode(false);
      },
    });
  };

  const handleBulkDelete = async () => {
    await batch.run({
      execute: () => itemsApi.deleteItemsBatch(selectedIds),
      onSuccess: () => {
        setIsBulkDeleteOpen(false);
        setSelectedIds([]);
        setSelectionMode(false);
      },
    });
  };

  return (
    <View style={screenRootStyle}>
      <Screen scroll contentInsetMode="page" chrome="muted" contentStyle={{ paddingBottom: 112 }} scrollProps={{ scrollEventThrottle: 32, onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const isPastWelcome = event.nativeEvent.contentOffset.y > WELCOME_SCROLL_THRESHOLD;
        if (isPastWelcome !== isFloatingAddVisible) setIsFloatingAddVisible(isPastWelcome);
      } }}>
        {hasAuxiliaryError ? <Pressable accessibilityRole="button" onPress={() => { void statsQuery.refetch(); void recentActivityQuery.refetch(); void categoriesQuery.refetch(); }} style={{ minHeight: 48 }}><Text style={{ color: palette.danger }}>部分统计或辅助信息加载失败，点击重试</Text></Pressable> : null}
        <HomeDashboard
          stats={statsQuery.data ?? null}
          statsLoading={statsQuery.isLoading || statsQuery.isError}
          recentItems={recentItems}
          recentItemPaths={recentItemPaths}
          recentActivity={recentActivityQuery.data ?? []}
          rootItems={rootItems}
          allItems={allItems}
          categories={categoriesQuery.data ?? []}
          viewMode={viewMode}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          canEditInventory={canEditInventory}
          onToggleSelectionMode={handleToggleSelectionMode}
          onChangeViewMode={setViewMode}
          onToggleSelected={handleToggleSelected}
          onCreate={() => setIsAddSheetOpen(true)}
        />
      </Screen>
      {!selectionMode && canEditInventory && isFloatingAddVisible ? (
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
      {selectionMode ? (
        <BulkActionBar
          selectedCount={selectedIds.length}
          bottom={Math.max(insets.bottom, 10) + 14}
          onEdit={() => setIsBulkEditOpen(true)}
          onDelete={() => setIsBulkDeleteOpen(true)}
        />
      ) : null}
      <HomeItemFormSheet visible={isAddSheetOpen} onClose={() => setIsAddSheetOpen(false)} />
      <HomeBulkEditSheet
        errorMessage={batch.errorMessage}
        visible={isBulkEditOpen}
        items={selectedItems}
        allItems={allItems}
        categories={categoriesQuery.data ?? []}
        onClose={() => setIsBulkEditOpen(false)}
        onSave={handleBulkSave}
      />
      <ConfirmDialog
        visible={isBulkDeleteOpen}
        title="确认批量删除"
        message={`${batch.errorMessage ? `${batch.errorMessage}\n` : ''}删除已选择的 ${selectedIds.length} 项？下级内容也会一并删除。`}
        loading={batch.isPending}
        confirmLabel="删除"
        danger
        onCancel={() => { if (!batch.isPending) setIsBulkDeleteOpen(false); }}
        onConfirm={() => void handleBulkDelete()}
      />
    </View>
  );
}

function buildRecentItemPaths(recentItems: Item[], allItems: Item[]) {
  const itemMap = new Map(allItems.map((item) => [item.id, item]));

  return Object.fromEntries(
    recentItems.map((item) => {
      const lineage: string[] = [];
      const visited = new Set<string>();
      let parentId = item.parent_id;

      while (parentId && !visited.has(parentId)) {
        visited.add(parentId);
        const parent = itemMap.get(parentId);
        if (!parent) {
          break;
        }

        lineage.unshift(parent.name);
        parentId = parent.parent_id;
      }

      return [item.id, lineage.join(' > ')];
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
  backgroundColor: palette.brandStrong,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  ...shadows.lg,
};
