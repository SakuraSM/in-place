import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Item } from '@inplace/domain';
import { ITEM_STATUS_PRESENTATION, ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { categoriesApi, itemsApi } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { BulkActionBar } from '@/shared/ui/BulkActionBar';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { ActionButtonRow } from '@/shared/ui/ActionButtonRow';
import { CompactListRow } from '@/shared/ui/CompactListRow';
import { StateBlock } from '@/shared/ui/StateBlock';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { resolveMobileContainerBrowseHref, resolveMobileDetailHref } from '@/shared/lib/detailPath';
import { getContainerTypeLabel, isLocationItem } from '@/shared/lib/location';
import { InventoryIcon } from '@/shared/ui/InventoryIcon';
import { palette } from '@/shared/ui/theme';
import { HomeBulkEditSheet, type BulkEditPayload } from '@/features/home/HomeBulkEditSheet';
import { formatInventoryDate, resolveInventoryImageUri } from '@/features/inventory/mobileInventoryFormat';
import { InventoryImage } from '@/features/inventory/InventoryImage';
import { MobileAttachmentsCard } from '@/features/inventory/MobileAttachmentsCard';
import { fetchAllOverviewItems } from '@/features/overview/overviewMobileData';
import {
  actionRowStyle,
  bodyStyle,
  categoryPillStyle,
  dangerButtonStyle,
  dangerButtonTextStyle,
  detailKickerStyle,
  detailTitleStyle,
  errorTextStyle,
  heroImageCardStyle,
  heroImageStyle,
  hintStyle,
  infoIconStyle,
  infoRowStyle,
  infoValueStyle,
  tagPillStyle,
  tagWrapStyle,
  titleCardHeaderStyle,
  typePillStyle,
} from '@/features/inventory/mobileDetailStyles';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const itemQuery = useQuery({
    queryKey: ['mobile', 'item-detail', id],
    enabled: Boolean(id),
    queryFn: () => itemsApi.fetchItem(id!),
  });
  const item = itemQuery.data ?? null;
  const ancestorsQuery = useQuery({
    queryKey: ['mobile', 'item-ancestors', id],
    enabled: Boolean(id),
    queryFn: () => itemsApi.fetchAncestors(id!),
  });
  const childrenQuery = useQuery({
    queryKey: ['mobile', 'item-children', id],
    enabled: Boolean(id) && item?.type === 'container',
    queryFn: () => itemsApi.fetchChildren(id!, item!.user_id),
  });
  const categoriesQuery = useQuery({
    queryKey: ['mobile', 'detail-categories', item?.user_id],
    enabled: Boolean(item?.user_id),
    staleTime: 1000 * 60,
    queryFn: () => categoriesApi.fetchCategories(item!.user_id),
  });
  const allItemsQuery = useQuery({
    queryKey: ['mobile', 'detail-all-items', item?.user_id],
    enabled: Boolean(item?.user_id),
    staleTime: 1000 * 60,
    queryFn: () => fetchAllOverviewItems(item!.user_id),
  });
  const deleteMutation = useMutation({
    mutationFn: () => itemsApi.deleteItem(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile'] });
      router.replace('/(tabs)');
    },
  });
  const childSelectionItems = useMemo(() => childrenQuery.data ?? [], [childrenQuery.data]);
  const selectedChildItems = useMemo(
    () => childSelectionItems.filter((child) => selectedIds.includes(child.id)),
    [childSelectionItems, selectedIds],
  );

  useEffect(() => {
    setSelectedIds((current) => {
      const nextIds = current.filter((selectedId) => childSelectionItems.some((child) => child.id === selectedId));
      return nextIds.length === current.length ? current : nextIds;
    });
  }, [childSelectionItems]);

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
        ? current.filter((selectedId) => selectedId !== itemId)
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

  const handleBulkDelete = async () => {
    await itemsApi.deleteItemsBatch(selectedIds);
    await queryClient.invalidateQueries({ queryKey: ['mobile'] });
    setIsBulkDeleteOpen(false);
    setSelectedIds([]);
    setSelectionMode(false);
  };

  if (itemQuery.isLoading) {
    return <Screen><StateBlock title="加载详情" loading /></Screen>;
  }

  if (itemQuery.isError) {
    return <Screen><StateBlock title="详情加载失败" body={itemQuery.error instanceof Error ? itemQuery.error.message : '请稍后重试'} /></Screen>;
  }

  if (!item) {
    return <Screen><StateBlock title="未找到该物品" body="该内容不存在或已删除" /></Screen>;
  }

  const children = childrenQuery.data ?? [];
  const childContainers = children.filter((child) => child.type === 'container');
  const childItems = children.filter((child) => child.type === 'item');
  const ancestors = (ancestorsQuery.data ?? []).filter((ancestor) => ancestor.id !== item.id);
  const itemTypeLabel = item.type === 'container' ? getContainerTypeLabel(item) : ITEM_TYPE_PRESENTATION.item.label;
  const activeImageUri = resolveInventoryImageUri(item.images[0]);
  const canBulkOperateChildren = item.type === 'container' && children.length > 1;
  const locationPath = formatDetailLocationPath(ancestors);

  return (
    <View style={{ flex: 1 }}>
    <Screen
      scroll
      contentInsetMode="page"
      chrome="muted"
      contentStyle={selectionMode ? { paddingBottom: 112 } : undefined}
    >
      <BrandHeader variant="page" title="详情" />

      <ActionButtonRow
        compact
        actions={[
          { key: 'back', label: '返回', iconName: 'arrow-back', onPress: () => router.back() },
          { key: 'edit', label: '编辑', iconName: 'create-outline', onPress: () => router.push(`/item/form?id=${item.id}`) },
          ...(canBulkOperateChildren
            ? [{ key: 'bulk', label: selectionMode ? '退出' : '批量', iconName: selectionMode ? 'close' as const : 'checkbox-outline' as const, onPress: handleToggleSelectionMode }]
            : []),
          ...(item.type === 'container'
            ? [{ key: 'add', label: '添加', iconName: 'add' as const, variant: 'primary' as const, onPress: () => router.push(`/item/form?parentId=${item.id}&type=item`) }]
            : []),
        ]}
      />

      {activeImageUri ? (
        <View style={heroImageCardStyle}>
          <InventoryImage url={item.images[0]} resizeMode="cover" style={heroImageStyle} />
        </View>
      ) : null}

      <SectionCard title="概览" delay={80} density="dense" headerMode="compact">
        <View style={overviewHeaderStyle}>
          <InventoryIcon type={item.type} isLocation={isLocationItem(item)} size="md" />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={titleCardHeaderStyle}>
              <View style={{ flex: 1 }}>
                <Text style={detailKickerStyle}>{itemTypeLabel}</Text>
                <Text style={detailTitleStyle}>{item.name}</Text>
              </View>
              <StatusBadge status={item.status} />
            </View>
            {item.category ? (
              <View style={summaryPillRowStyle}>
                <Text style={categoryPillStyle}>{item.category}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <Text style={bodyStyle}>{item.description || '暂无说明'}</Text>
        {item.type === 'container' ? (
          <ContainerStatsSummary
            itemTypeLabel={itemTypeLabel}
            childContainersCount={childContainers.length}
            childItemsCount={childItems.length}
            childrenCount={children.length}
            depth={ancestors.length + 1}
          />
        ) : null}
        <OverviewMetaRows
          locationPath={locationPath}
          createdAt={item.created_at}
          updatedAt={item.updated_at}
        />
      </SectionCard>

      {item.type === 'item' ? (
        <PurchaseInfoCard item={item} />
      ) : null}

      {item.tags.length > 0 ? (
        <SectionCard title="标签" delay={140} density="dense" headerMode="compact">
          <View style={tagWrapStyle}>
            {item.tags.map((tag) => (
              <Text key={tag} style={tagPillStyle}>{tag}</Text>
            ))}
          </View>
        </SectionCard>
      ) : null}

      {item.type === 'item' ? <MobileAttachmentsCard itemId={item.id} /> : null}

      {item.images.length > 1 ? (
        <SectionCard title={`图片 ${item.images.length}`} delay={175} density="dense" headerMode="compact">
          <View style={imageGridStyle}>
            {item.images.map((imageUrl) => {
              const imageUri = resolveInventoryImageUri(imageUrl);
              return imageUri ? <InventoryImage key={imageUrl} url={imageUrl} resizeMode="cover" style={thumbImageStyle} /> : null;
            })}
          </View>
        </SectionCard>
      ) : null}

      {item.type === 'container' && childContainers.length > 0 ? (
        <ChildrenSection
          title={`下级位置/收纳 ${childContainers.length}`}
          childrenItems={childContainers}
          delay={190}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelected={handleToggleSelected}
        />
      ) : null}

      {item.type === 'container' && childItems.length > 0 ? (
        <ChildrenSection
          title={`下级物品 ${childItems.length}`}
          childrenItems={childItems}
          delay={210}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelected={handleToggleSelected}
        />
      ) : null}

      <SectionCard title="危险操作" delay={230} density="dense" tone="muted" headerMode="compact">
        {deleteMutation.isError ? (
          <Text style={errorTextStyle}>
            {deleteMutation.error instanceof Error ? deleteMutation.error.message : '删除失败'}
          </Text>
        ) : null}
        <Pressable onPress={() => setIsDeleteDialogOpen(true)} style={dangerButtonStyle}>
          <Text style={dangerButtonTextStyle}>删除{item.type === 'container' ? getContainerTypeLabel(item) : '物品'}</Text>
        </Pressable>
      </SectionCard>

      <ConfirmDialog
        visible={isDeleteDialogOpen}
        title={`确认删除${item.type === 'container' ? getContainerTypeLabel(item) : '物品'}`}
        message={`删除「${item.name}」？${item.type === 'container' ? `下级内容也会删除。` : ''}`}
        confirmLabel={deleteMutation.isPending ? '删除中...' : '删除'}
        danger
        loading={deleteMutation.isPending}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => void deleteMutation.mutateAsync()}
      />
      </Screen>
      {selectionMode ? (
        <BulkActionBar
          selectedCount={selectedIds.length}
          bottom={Math.max(insets.bottom, 10) + 14}
          onEdit={() => setIsBulkEditOpen(true)}
          onDelete={() => setIsBulkDeleteOpen(true)}
        />
      ) : null}
      <HomeBulkEditSheet
        visible={isBulkEditOpen}
        items={selectedChildItems}
        allItems={allItemsQuery.data ?? []}
        categories={categoriesQuery.data ?? []}
        onClose={() => setIsBulkEditOpen(false)}
        onSave={handleBulkSave}
      />
      <ConfirmDialog
        visible={isBulkDeleteOpen}
        title="确认批量删除"
        message={`删除已选择的 ${selectedIds.length} 项？下级内容也会一并删除。`}
        confirmLabel="删除"
        danger
        onCancel={() => setIsBulkDeleteOpen(false)}
        onConfirm={() => void handleBulkDelete()}
      />
    </View>
  );
}

function ChildrenSection({
  title,
  childrenItems,
  delay,
  selectionMode,
  selectedIds,
  onToggleSelected,
}: {
  title: string;
  childrenItems: Item[];
  delay: number;
  selectionMode: boolean;
  selectedIds: string[];
  onToggleSelected: (itemId: string) => void;
}) {
  return (
    <SectionCard title={title} delay={delay} density="dense" headerMode="compact">
      <View style={{ gap: 8 }}>
        {childrenItems.map((child) => (
          <ChildRow
            key={child.id}
            child={child}
            selectionMode={selectionMode}
            selected={selectedIds.includes(child.id)}
            onToggleSelected={onToggleSelected}
          />
        ))}
      </View>
    </SectionCard>
  );
}

function PurchaseInfoCard({ item }: { item: Item }) {
  if (item.price === null && !item.purchase_date && !item.warranty_date) {
    return null;
  }

  return (
    <SectionCard title="购买信息" delay={110} density="dense" headerMode="compact">
      <View style={{ gap: 8 }}>
        {item.price !== null ? <InfoRow icon="cash-outline" label="购买价格" value={`¥${item.price.toFixed(2)}`} /> : null}
        {item.purchase_date ? <InfoRow icon="calendar-outline" label="购买日期" value={item.purchase_date} /> : null}
        {item.warranty_date ? <InfoRow icon="shield-checkmark-outline" label="保修截止" value={item.warranty_date} /> : null}
      </View>
    </SectionCard>
  );
}

function ChildRow({
  child,
  selectionMode,
  selected,
  onToggleSelected,
}: {
  child: Item;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelected: (itemId: string) => void;
}) {
  const row = (
    <CompactListRow
      title={child.name}
      subtitle={`${child.type === 'container' ? getContainerTypeLabel(child) : ITEM_TYPE_PRESENTATION.item.label}${child.category ? ` · ${child.category}` : ''}`}
      icon={<InventoryIcon type={child.type} isLocation={isLocationItem(child)} size="sm" />}
      iconFramed={false}
      selected={selected}
      right={(
        <View style={childRightStyle}>
          {child.type === 'item' ? <StatusBadge status={child.status} /> : <Text style={typePillStyle}>{getContainerTypeLabel(child)}</Text>}
          {selectionMode ? (
            <View style={[selectionDotStyle, selected ? selectionDotActiveStyle : null]}>
              {selected ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={palette.textSoft} />
          )}
        </View>
      )}
    />
  );

  if (selectionMode) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${selected ? '取消选择' : '选择'}${child.name}`}
        accessibilityState={{ selected }}
        onPress={() => onToggleSelected(child.id)}
      >
        {row}
      </Pressable>
    );
  }

  if (child.type === 'container') {
    return (
      <Pressable
        delayLongPress={500}
        onLongPress={() => router.push(resolveMobileDetailHref(child))}
        onPress={() => router.push(resolveMobileContainerBrowseHref(child))}
      >
        {row}
      </Pressable>
    );
  }

  return <Pressable onPress={() => router.push(resolveMobileDetailHref(child))}>{row}</Pressable>;
}

function ContainerStatsSummary({
  itemTypeLabel,
  childContainersCount,
  childItemsCount,
  childrenCount,
  depth,
}: {
  itemTypeLabel: string;
  childContainersCount: number;
  childItemsCount: number;
  childrenCount: number;
  depth: number;
}) {
  return (
    <View style={statsSummaryStyle}>
      <StatSummaryTile label="位置/收纳" value={childContainersCount} />
      <StatSummaryTile label="下级物品" value={childItemsCount} />
      <StatSummaryTile label="直接包含" value={childrenCount} />
      <StatSummaryTile label={`${itemTypeLabel}层级`} value={depth} />
    </View>
  );
}

function StatSummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <View style={statSummaryTileStyle}>
      <Text numberOfLines={1} style={statSummaryValueStyle}>{value}</Text>
      <Text numberOfLines={1} style={statSummaryLabelStyle}>{label}</Text>
    </View>
  );
}

function OverviewMetaRows({
  locationPath,
  createdAt,
  updatedAt,
}: {
  locationPath: string | null;
  createdAt: string;
  updatedAt: string;
}) {
  return (
    <View style={overviewMetaStyle}>
      {locationPath ? <OverviewMetaRow icon="location-outline" label="位置" value={locationPath} /> : null}
      <View style={overviewMetaGridStyle}>
        <OverviewMetaRow icon="time-outline" label="创建" value={formatInventoryDate(createdAt)} compact />
        <OverviewMetaRow icon="refresh-outline" label="更新" value={formatInventoryDate(updatedAt)} compact />
      </View>
    </View>
  );
}

function OverviewMetaRow({
  icon,
  label,
  value,
  compact = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <View style={[overviewMetaRowStyle, compact ? overviewMetaCompactRowStyle : null]}>
      <Ionicons name={icon} size={14} color={palette.textSoft} />
      <Text style={overviewMetaLabelStyle}>{label}</Text>
      <Text numberOfLines={1} style={overviewMetaValueStyle}>{value}</Text>
    </View>
  );
}

function formatDetailLocationPath(ancestors: Item[]) {
  if (ancestors.length === 0) {
    return null;
  }

  return ancestors.map((ancestor) => ancestor.name).join(' > ');
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={infoRowStyle}>
      <View style={infoIconStyle}>
        <Ionicons name={icon} size={17} color={palette.brand} />
      </View>
      <View>
        <Text style={hintStyle}>{label}</Text>
        <Text selectable style={infoValueStyle}>{value}</Text>
      </View>
    </View>
  );
}

const overviewHeaderStyle = {
  flexDirection: 'row' as const,
  alignItems: 'flex-start' as const,
  gap: 12,
};

const summaryPillRowStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 8,
};

const statsSummaryStyle = {
  borderTopWidth: 1,
  borderTopColor: palette.borderSoft,
  paddingTop: 12,
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 8,
};

const statSummaryTileStyle = {
  width: '48.6%' as const,
  minHeight: 58,
  borderRadius: 15,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 12,
  paddingVertical: 9,
  justifyContent: 'center' as const,
  gap: 2,
};

const statSummaryValueStyle = {
  fontSize: 22,
  lineHeight: 26,
  fontWeight: '900' as const,
  color: palette.brandStrong,
};

const statSummaryLabelStyle = {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '700' as const,
  color: palette.textSoft,
};

const overviewMetaStyle = {
  borderTopWidth: 1,
  borderTopColor: palette.borderSoft,
  paddingTop: 12,
  gap: 8,
};

const overviewMetaGridStyle = {
  flexDirection: 'row' as const,
  gap: 8,
};

const overviewMetaRowStyle = {
  minHeight: 36,
  borderRadius: 13,
  backgroundColor: palette.surfaceMuted,
  paddingHorizontal: 10,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 5,
};

const overviewMetaCompactRowStyle = {
  flex: 1,
  minWidth: 0,
};

const overviewMetaLabelStyle = {
  fontSize: 12,
  fontWeight: '700' as const,
  color: palette.textSoft,
};

const overviewMetaValueStyle = {
  flex: 1,
  minWidth: 0,
  fontSize: 13,
  fontWeight: '800' as const,
  color: palette.textMuted,
};

const childRightStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
};

const selectionDotStyle = {
  width: 24,
  height: 24,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.surface,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const selectionDotActiveStyle = {
  borderColor: palette.brand,
  backgroundColor: palette.brand,
};

const imageGridStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 10,
};

const thumbImageStyle = {
  width: 88,
  height: 88,
  borderRadius: 16,
  backgroundColor: palette.surfaceMuted,
};
