import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { itemsApi } from '@/shared/api/mobileClient';
import { resolveMobileContainerBrowseHref, resolveMobileDetailHref } from '@/shared/lib/detailPath';
import { getContainerTypeLabel, isLocationItem } from '@/shared/lib/location';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { ActionButtonRow } from '@/shared/ui/ActionButtonRow';
import { CompactListRow } from '@/shared/ui/CompactListRow';
import { InventoryIcon } from '@/shared/ui/InventoryIcon';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { palette } from '@/shared/ui/theme';
import { resolveInventoryImageUri } from '@/features/inventory/mobileInventoryFormat';
import { InventoryImage } from '@/features/inventory/InventoryImage';

export default function ContainerBrowseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const containerQuery = useQuery({
    queryKey: ['mobile', 'container-browse-detail', id],
    enabled: Boolean(id),
    queryFn: () => itemsApi.fetchItem(id!),
  });
  const container = containerQuery.data ?? null;
  const ancestorsQuery = useQuery({
    queryKey: ['mobile', 'container-browse-ancestors', id],
    enabled: Boolean(id),
    queryFn: () => itemsApi.fetchAncestors(id!),
  });
  const childrenQuery = useQuery({
    queryKey: ['mobile', 'container-browse-children', id, container?.user_id],
    enabled: Boolean(id) && Boolean(container?.user_id),
    queryFn: () => itemsApi.fetchChildren(id!, container!.user_id),
  });

  if (containerQuery.isLoading) {
    return <Screen><StateBlock title="加载内容" loading /></Screen>;
  }

  if (containerQuery.isError) {
    return <Screen><StateBlock title="内容加载失败" body={containerQuery.error instanceof Error ? containerQuery.error.message : '请稍后重试'} /></Screen>;
  }

  if (!container || container.type !== 'container') {
    return <Screen><StateBlock title="未找到该位置或收纳" body="该内容不存在或已删除" /></Screen>;
  }

  const children = childrenQuery.data ?? [];
  const containers = children.filter((item) => item.type === 'container');
  const leafItems = children.filter((item) => item.type === 'item');
  const pathItems = (ancestorsQuery.data ?? []).filter((item) => item.id !== container.id);
  const containerLabel = getContainerTypeLabel(container);

  return (
    <Screen scroll contentInsetMode="page" chrome="muted">
      <BrandHeader
        variant="page"
        title={container.name}
        subtitle={`${containerLabel}内容 · ${children.length} 项`}
        accessory={(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="查看详情"
            onPress={() => router.push(resolveMobileDetailHref(container))}
            style={iconActionStyle}
          >
            <Ionicons name="information-circle-outline" size={20} color={palette.textMuted} />
          </Pressable>
        )}
      />

      <ActionButtonRow
        compact
        actions={[
          { key: 'back', label: '返回', iconName: 'arrow-back', onPress: () => router.back() },
          { key: 'add', label: '添加内容', iconName: 'add', variant: 'primary', onPress: () => router.push(`/item/form?parentId=${container.id}&type=item`) },
        ]}
      />

      <SectionCard title="收纳位置" delay={60} density="dense" headerMode="compact">
        <View style={pathRailStyle}>
          {pathItems.map((pathItem, index) => (
            <View key={pathItem.id} style={pathNodeStyle}>
              {index > 0 ? <Ionicons name="chevron-forward" size={13} color={palette.textSoft} /> : null}
              <Text numberOfLines={1} style={pathTextStyle}>{pathItem.name}</Text>
            </View>
          ))}
          <View style={pathNodeStyle}>
            {pathItems.length > 0 ? <Ionicons name="chevron-forward" size={13} color={palette.textSoft} /> : null}
            <Text numberOfLines={1} style={activePathTextStyle}>{container.name}</Text>
          </View>
        </View>
      </SectionCard>

      <ContentSection title={`位置/收纳 (${containers.length})`} items={containers} />
      <ContentSection title={`物品 (${leafItems.length})`} items={leafItems} />
    </Screen>
  );
}

function ContentSection({ title, items }: { title: string; items: Item[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <SectionCard title={title} delay={110} density="dense" headerMode="compact">
      <View style={contentListStyle}>
        {items.map((item) => <ContentRow key={item.id} item={item} />)}
      </View>
    </SectionCard>
  );
}

function ContentRow({ item }: { item: Item }) {
  const imageUri = resolveInventoryImageUri(item.images[0]);
  const icon = imageUri
    ? <InventoryImage url={item.images[0]} resizeMode="cover" style={thumbImageStyle} />
    : <InventoryIcon type={item.type} isLocation={isLocationItem(item)} size="sm" />;
  const row = (
    <CompactListRow
      title={item.name}
      subtitle={`${item.type === 'container' ? getContainerTypeLabel(item) : ITEM_TYPE_PRESENTATION.item.label}${item.category ? ` · ${item.category}` : ''}`}
      icon={icon}
      iconFramed={Boolean(imageUri)}
      right={(
        <View style={rowRightStyle}>
          {item.type === 'item' ? <StatusBadge status={item.status} /> : null}
          <Ionicons name="chevron-forward" size={18} color={palette.textSoft} />
        </View>
      )}
    />
  );

  if (item.type === 'container') {
    return (
      <Pressable
        delayLongPress={500}
        onLongPress={() => router.push(resolveMobileDetailHref(item))}
        onPress={() => router.push(resolveMobileContainerBrowseHref(item))}
      >
        {row}
      </Pressable>
    );
  }

  return (
    <Pressable onPress={() => router.push(resolveMobileDetailHref(item))}>
      {row}
    </Pressable>
  );
}

const iconActionStyle = {
  width: 40,
  height: 40,
  borderRadius: 14,
  backgroundColor: palette.canvasStrong,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const pathRailStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  flexWrap: 'wrap' as const,
  gap: 5,
};

const pathNodeStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 3,
  maxWidth: '48%' as const,
};

const pathTextStyle = {
  fontSize: 13,
  lineHeight: 18,
  color: palette.textMuted,
};

const activePathTextStyle = {
  fontSize: 13,
  lineHeight: 18,
  fontWeight: '800' as const,
  color: palette.text,
};

const contentListStyle = {
  gap: 10,
};

const thumbImageStyle = {
  width: '100%' as const,
  height: '100%' as const,
  borderRadius: 12,
};

const rowRightStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
};
