import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image, Pressable, Text, View } from 'react-native';
import type { Item } from '@inplace/domain';
import { ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { itemsApi } from '@/shared/api/mobileClient';
import { resolveMobileContainerBrowseHref, resolveMobileDetailHref } from '@/shared/lib/detailPath';
import { getContainerTypeLabel } from '@/shared/lib/location';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { palette, shadows } from '@/shared/ui/theme';
import { resolveInventoryImageUri } from '@/features/inventory/mobileInventoryFormat';

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
    return <Screen><StateBlock title="加载收纳" loading /></Screen>;
  }

  if (containerQuery.isError) {
    return <Screen><StateBlock title="收纳加载失败" body={containerQuery.error instanceof Error ? containerQuery.error.message : '请稍后重试'} /></Screen>;
  }

  if (!container || container.type !== 'container') {
    return <Screen><StateBlock title="未找到该收纳" body={`当前占位 ID：${id}`} /></Screen>;
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
          <Pressable onPress={() => router.push(resolveMobileDetailHref(container))} style={iconActionStyle}>
            <Ionicons name="document-text-outline" size={18} color={palette.textMuted} />
          </Pressable>
        )}
      />

      <View style={navRowStyle}>
        <Pressable onPress={() => router.back()} style={secondaryButtonStyle}>
          <Ionicons name="arrow-back" size={16} color={palette.textMuted} />
          <Text style={secondaryButtonTextStyle}>返回</Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/item/form?parentId=${container.id}&type=item`)} style={primaryButtonStyle}>
          <Ionicons name="add" size={17} color="#ffffff" />
          <Text style={primaryButtonTextStyle}>添加内容</Text>
        </Pressable>
      </View>

      <SectionCard title="当前路径" subtitle="短按进入，长按详情" delay={60} density="compact">
        <View style={pathRailStyle}>
          <Text style={pathTextStyle}>顶层</Text>
          {pathItems.map((pathItem) => (
            <View key={pathItem.id} style={pathNodeStyle}>
              <Ionicons name="chevron-forward" size={13} color={palette.textSoft} />
              <Text numberOfLines={1} style={pathTextStyle}>{pathItem.name}</Text>
            </View>
          ))}
          <View style={pathNodeStyle}>
            <Ionicons name="chevron-forward" size={13} color={palette.textSoft} />
            <Text numberOfLines={1} style={activePathTextStyle}>{container.name}</Text>
          </View>
        </View>
      </SectionCard>

      <ContentSection title={`收纳 (${containers.length})`} items={containers} emptyText={`这个${containerLabel}下暂无下级收纳。`} />
      <ContentSection title={`物品 (${leafItems.length})`} items={leafItems} emptyText={`这个${containerLabel}下暂无物品。`} />
    </Screen>
  );
}
function ContentSection({ title, items, emptyText }: { title: string; items: Item[]; emptyText: string }) {
  return (
    <SectionCard title={title} delay={110} density="compact">
      {items.length === 0 ? (
        <View style={emptyBoxStyle}>
          <Text style={emptyTextStyle}>{emptyText}</Text>
        </View>
      ) : (
        <View style={contentListStyle}>
          {items.map((item) => <ContentRow key={item.id} item={item} />)}
        </View>
      )}
    </SectionCard>
  );
}

function ContentRow({ item }: { item: Item }) {
  const imageUri = resolveInventoryImageUri(item.images[0]);
  const row = (
    <View style={contentRowStyle}>
      <View style={thumbFrameStyle}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} resizeMode="cover" style={thumbImageStyle} />
        ) : (
          <Ionicons name={item.type === 'container' ? 'business-outline' : 'cube-outline'} size={20} color={palette.brand} />
        )}
      </View>
      <View style={rowTextStyle}>
        <Text numberOfLines={1} style={rowTitleStyle}>{item.name}</Text>
        <Text numberOfLines={1} style={rowMetaStyle}>
          {item.type === 'container' ? getContainerTypeLabel(item) : ITEM_TYPE_PRESENTATION.item.label}
          {item.category ? ` · ${item.category}` : ''}
        </Text>
      </View>
      {item.type === 'item' ? <StatusBadge status={item.status} /> : null}
      <Ionicons name="chevron-forward" size={18} color={palette.textSoft} />
    </View>
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
  backgroundColor: '#f1f5f9',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

const navRowStyle = {
  flexDirection: 'row' as const,
  gap: 10,
};

const secondaryButtonStyle = {
  minHeight: 44,
  borderRadius: 16,
  backgroundColor: palette.surface,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 14,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
};

const secondaryButtonTextStyle = {
  color: palette.textMuted,
  fontSize: 14,
  fontWeight: '700' as const,
};

const primaryButtonStyle = {
  flex: 1,
  minHeight: 44,
  borderRadius: 16,
  backgroundColor: palette.brand,
  paddingHorizontal: 14,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 6,
  ...shadows.sm,
};

const primaryButtonTextStyle = {
  color: '#ffffff',
  fontSize: 14,
  fontWeight: '800' as const,
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

const contentRowStyle = {
  minHeight: 70,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: palette.borderSoft,
  backgroundColor: palette.surface,
  padding: 10,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 10,
};

const thumbFrameStyle = {
  width: 48,
  height: 48,
  borderRadius: 16,
  backgroundColor: '#eef9fd',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  overflow: 'hidden' as const,
};

const thumbImageStyle = {
  width: '100%' as const,
  height: '100%' as const,
};

const rowTextStyle = {
  flex: 1,
  minWidth: 0,
  gap: 3,
};

const rowTitleStyle = {
  fontSize: 16,
  fontWeight: '800' as const,
  color: palette.text,
};

const rowMetaStyle = {
  fontSize: 13,
  lineHeight: 18,
  color: palette.textSoft,
};

const emptyBoxStyle = {
  borderRadius: 18,
  borderWidth: 1,
  borderStyle: 'dashed' as const,
  borderColor: palette.border,
  backgroundColor: palette.surfaceMuted,
  paddingVertical: 22,
  paddingHorizontal: 14,
};

const emptyTextStyle = {
  textAlign: 'center' as const,
  fontSize: 14,
  lineHeight: 20,
  color: palette.textSoft,
};
