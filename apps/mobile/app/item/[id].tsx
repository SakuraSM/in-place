import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { ITEM_STATUS_PRESENTATION, ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { itemsApi } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { resolveMobileContainerBrowseHref, resolveMobileDetailHref } from '@/shared/lib/detailPath';
import { getContainerTypeLabel } from '@/shared/lib/location';
import { palette } from '@/shared/ui/theme';
import { formatInventoryDate, resolveInventoryImageUri } from '@/features/inventory/mobileInventoryFormat';
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
  listTitleStyle,
  metricGridStyle,
  metricLabelStyle,
  metricStyle,
  metricValueStyle,
  pathNodeStyle,
  pathRailStyle,
  pathTextStyle,
  primaryButtonStyle,
  primaryButtonTextStyle,
  rowStyle,
  secondaryButtonStyle,
  secondaryButtonTextStyle,
  tagPillStyle,
  tagWrapStyle,
  titleCardHeaderStyle,
  typePillStyle,
} from '@/features/inventory/mobileDetailStyles';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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
  const deleteMutation = useMutation({
    mutationFn: () => itemsApi.deleteItem(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mobile'] });
      router.replace('/(tabs)');
    },
  });

  if (itemQuery.isLoading) {
    return <Screen><StateBlock title="加载详情" loading /></Screen>;
  }

  if (itemQuery.isError) {
    return <Screen><StateBlock title="详情加载失败" body={itemQuery.error instanceof Error ? itemQuery.error.message : '请稍后重试'} /></Screen>;
  }

  if (!item) {
    return <Screen><StateBlock title="未找到该物品" body={`当前占位 ID：${id}`} /></Screen>;
  }

  const children = childrenQuery.data ?? [];
  const childContainers = children.filter((child) => child.type === 'container');
  const childItems = children.filter((child) => child.type === 'item');
  const ancestors = (ancestorsQuery.data ?? []).filter((ancestor) => ancestor.id !== item.id);
  const itemTypeLabel = item.type === 'container' ? getContainerTypeLabel(item) : ITEM_TYPE_PRESENTATION.item.label;
  const activeImageUri = resolveInventoryImageUri(item.images[0]);

  return (
    <Screen scroll contentInsetMode="page" chrome="muted">
      <BrandHeader variant="page" title="详情" />

      <View style={actionRowStyle}>
        <Pressable onPress={() => router.back()} style={secondaryButtonStyle}>
          <Ionicons name="arrow-back" size={16} color={palette.textMuted} />
          <Text style={secondaryButtonTextStyle}>返回</Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/item/form?id=${item.id}`)} style={secondaryButtonStyle}>
          <Ionicons name="create-outline" size={16} color={palette.textMuted} />
          <Text style={secondaryButtonTextStyle}>编辑</Text>
        </Pressable>
        {item.type === 'container' ? (
          <Pressable onPress={() => router.push(`/item/form?parentId=${item.id}&type=item`)} style={primaryButtonStyle}>
            <Ionicons name="add" size={17} color="#ffffff" />
            <Text style={primaryButtonTextStyle}>添加内容</Text>
          </Pressable>
        ) : null}
      </View>

      {activeImageUri ? (
        <View style={heroImageCardStyle}>
          <Image source={{ uri: activeImageUri }} resizeMode="cover" style={heroImageStyle} />
        </View>
      ) : null}

      <SectionCard title="概览" delay={80} density="compact">
        <View style={overviewHeaderStyle}>
          <View style={overviewIconStyle}>
            <Ionicons name={item.type === 'container' ? 'cube-outline' : 'pricetag-outline'} size={24} color={palette.brandStrong} />
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={titleCardHeaderStyle}>
              <View style={{ flex: 1 }}>
                <Text style={detailKickerStyle}>{itemTypeLabel}</Text>
                <Text style={detailTitleStyle}>{item.name}</Text>
              </View>
              <StatusBadge status={item.status} />
            </View>
            <View style={summaryPillRowStyle}>
              <Text style={typePillStyle}>{itemTypeLabel}</Text>
              {item.category ? <Text style={categoryPillStyle}>{item.category}</Text> : null}
            </View>
          </View>
        </View>
        <Text style={bodyStyle}>{item.description || '暂无描述'}</Text>
      </SectionCard>

      {item.type === 'container' ? (
        <SectionCard title={`${itemTypeLabel}信息`} delay={110} density="compact">
          <View style={metricGridStyle}>
            <Metric label="下级收纳" value={`${childContainers.length}`} />
            <Metric label="下级物品" value={`${childItems.length}`} />
          </View>
          <View style={metricGridStyle}>
            <Metric label="直接包含" value={`${children.length}`} />
            <Metric label={`${itemTypeLabel}层级`} value={`${ancestors.length + 1}`} />
          </View>
        </SectionCard>
      ) : (
        <PurchaseInfoCard item={item} />
      )}

      <PathCard ancestors={ancestors} />

      {item.tags.length > 0 ? (
        <SectionCard title="标签" delay={140} density="compact">
          <View style={tagWrapStyle}>
            {item.tags.map((tag) => (
              <Text key={tag} style={tagPillStyle}>{tag}</Text>
            ))}
          </View>
        </SectionCard>
      ) : null}

      <SectionCard title="时间信息" delay={160} density="compact">
        <View style={metricGridStyle}>
          <Metric label="创建时间" value={formatInventoryDate(item.created_at)} />
          <Metric label="最后更新" value={formatInventoryDate(item.updated_at)} />
        </View>
      </SectionCard>

      {item.images.length > 1 ? (
        <SectionCard title={`图片 ${item.images.length}`} delay={175} density="compact">
          <View style={imageGridStyle}>
            {item.images.map((imageUrl) => {
              const imageUri = resolveInventoryImageUri(imageUrl);
              return imageUri ? <Image key={imageUrl} source={{ uri: imageUri }} resizeMode="cover" style={thumbImageStyle} /> : null;
            })}
          </View>
        </SectionCard>
      ) : null}

      {item.type === 'container' && childContainers.length > 0 ? (
        <ChildrenSection title={`下级收纳 ${childContainers.length}`} childrenItems={childContainers} delay={190} />
      ) : null}

      {item.type === 'container' && childItems.length > 0 ? (
        <ChildrenSection title={`下级物品 ${childItems.length}`} childrenItems={childItems} delay={210} />
      ) : null}

      <SectionCard title="危险操作" delay={230} density="compact" tone="muted">
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
  );
}

function ChildrenSection({
  title,
  childrenItems,
  delay,
}: {
  title: string;
  childrenItems: Item[];
  delay: number;
}) {
  return (
    <SectionCard title={title} subtitle="短按进入，长按详情" delay={delay} density="compact">
      <View style={{ gap: 10 }}>
        {childrenItems.map((child) => <ChildRow key={child.id} child={child} />)}
      </View>
    </SectionCard>
  );
}

function PurchaseInfoCard({ item }: { item: Item }) {
  if (item.price === null && !item.purchase_date && !item.warranty_date) {
    return null;
  }

  return (
    <SectionCard title="购买信息" delay={110} density="compact">
      <View style={{ gap: 10 }}>
        {item.price !== null ? <InfoRow icon="cash-outline" label="购买价格" value={`¥${item.price.toFixed(2)}`} /> : null}
        {item.purchase_date ? <InfoRow icon="calendar-outline" label="购买日期" value={item.purchase_date} /> : null}
        {item.warranty_date ? <InfoRow icon="shield-checkmark-outline" label="保修截止" value={item.warranty_date} /> : null}
      </View>
    </SectionCard>
  );
}

function PathCard({ ancestors }: { ancestors: Item[] }) {
  if (ancestors.length === 0) {
    return null;
  }

  return (
    <SectionCard title="所在路径" delay={130} density="compact">
      <View style={pathRailStyle}>
        <Text style={pathTextStyle}>顶层</Text>
        {ancestors.map((ancestor) => (
          <View key={ancestor.id} style={pathNodeStyle}>
            <Ionicons name="chevron-forward" size={13} color={palette.textSoft} />
            <Text numberOfLines={1} style={pathTextStyle}>{ancestor.name}</Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
}

function ChildRow({ child }: { child: Item }) {
  const row = (
    <View style={rowStyle}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text numberOfLines={1} style={listTitleStyle}>{child.name}</Text>
        <Text numberOfLines={1} style={bodyStyle}>
          {child.type === 'container' ? getContainerTypeLabel(child) : ITEM_TYPE_PRESENTATION.item.label}{child.category ? ` · ${child.category}` : ''}
        </Text>
      </View>
      {child.type === 'item' ? <StatusBadge status={child.status} /> : <Text style={typePillStyle}>{getContainerTypeLabel(child)}</Text>}
      <Ionicons name="chevron-forward" size={18} color={palette.textSoft} />
    </View>
  );

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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={metricStyle}>
      <Text style={metricLabelStyle}>{label}</Text>
      <Text numberOfLines={1} style={metricValueStyle}>{value}</Text>
    </View>
  );
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

const overviewIconStyle = {
  width: 48,
  height: 48,
  borderRadius: 16,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: '#e0f2fe',
};

const summaryPillRowStyle = {
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: 8,
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
