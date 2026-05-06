import { Link, router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ITEM_STATUS_PRESENTATION, ITEM_TYPE_PRESENTATION } from '@inplace/app-core';
import { itemsApi } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { resolveMobileDetailHref } from '@/shared/lib/detailPath';
import { getContainerTypeLabel } from '@/shared/lib/location';
import { palette } from '@/shared/ui/theme';

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
    return <Screen><StateBlock title="正在加载详情" loading /></Screen>;
  }

  if (itemQuery.isError) {
    return <Screen><StateBlock title="详情加载失败" body={itemQuery.error instanceof Error ? itemQuery.error.message : '请稍后重试。'} /></Screen>;
  }

  if (!item) {
    return <Screen><StateBlock title="未找到该物品" body={`当前占位 ID：${id}`} /></Screen>;
  }

  const children = childrenQuery.data ?? [];
  const breadcrumb = ancestorsQuery.data?.map((ancestor) => ancestor.name).join(' / ') ?? item.name;

  return (
    <Screen scroll>
      <BrandHeader
        compact
        title={item.name}
        subtitle={`${item.type === 'container' ? getContainerTypeLabel(item) : ITEM_TYPE_PRESENTATION.item.label} · ${ITEM_STATUS_PRESENTATION[item.status].label}`}
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable onPress={() => router.back()} style={secondaryButtonStyle}>
          <Text style={secondaryButtonTextStyle}>返回</Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/item/form?id=${item.id}`)} style={secondaryButtonStyle}>
          <Text style={secondaryButtonTextStyle}>编辑</Text>
        </Pressable>
        {item.type === 'container' ? (
          <Pressable onPress={() => router.push(`/item/form?parentId=${item.id}&type=item`)} style={primaryButtonStyle}>
            <Text style={primaryButtonTextStyle}>添加内容</Text>
          </Pressable>
        ) : null}
      </View>

      <SectionCard title="基础信息" subtitle="和 Web 详情页保持一致的主信息卡片。" delay={80}>
        <StatusBadge status={item.status} />
        <Text style={hintStyle}>路径：{breadcrumb}</Text>
        <Text style={bodyStyle}>类别：{item.category || '未分类'}</Text>
        <Text style={bodyStyle}>描述：{item.description || '暂无描述'}</Text>
        <Text style={bodyStyle}>价格：{item.price ?? '未设置'}</Text>
        <Text style={bodyStyle}>标签：{item.tags.length ? item.tags.join('、') : '暂无标签'}</Text>
        <Text style={bodyStyle}>图片数：{item.images.length}</Text>
      </SectionCard>

      {item.type === 'container' ? (
        <SectionCard title="直接内容" subtitle={`继续下钻浏览这个${getContainerTypeLabel(item)}里的物品、收纳和位置。`} delay={150}>
          {children.length === 0 ? (
            <Text style={bodyStyle}>这个{getContainerTypeLabel(item)}里还没有直接内容。</Text>
          ) : (
            children.map((child) => (
              <Link key={child.id} href={resolveMobileDetailHref(child)} asChild>
                <Pressable style={rowStyle}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={listTitleStyle}>{child.name}</Text>
                    <Text style={bodyStyle}>
                       {child.type === 'container' ? getContainerTypeLabel(child) : ITEM_TYPE_PRESENTATION.item.label}{child.category ? ` · ${child.category}` : ''}
                    </Text>
                  </View>
                  <StatusBadge status={child.status} />
                </Pressable>
              </Link>
            ))
          )}
        </SectionCard>
      ) : null}

      <SectionCard title="危险操作" subtitle="删除后不可撤销，容器下的内容也会一起删除。" delay={220}>
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
        message={`确定要删除「${item.name}」吗？此操作不可撤销。${item.type === 'container' ? `该${getContainerTypeLabel(item)}下的所有内容也会一起删除。` : ''}`}
        confirmLabel={deleteMutation.isPending ? '删除中...' : '删除'}
        danger
        loading={deleteMutation.isPending}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => void deleteMutation.mutateAsync()}
      />
    </Screen>
  );
}

const bodyStyle = {
  fontSize: 15,
  lineHeight: 22,
  color: palette.textMuted,
};

const hintStyle = {
  fontSize: 13,
  color: palette.textSoft,
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

const secondaryButtonStyle = {
  borderRadius: 16,
  backgroundColor: palette.surface,
  borderWidth: 1,
  borderColor: palette.border,
  paddingHorizontal: 16,
  paddingVertical: 12,
};

const secondaryButtonTextStyle = {
  color: palette.text,
  fontSize: 14,
  fontWeight: '600' as const,
};

const primaryButtonStyle = {
  borderRadius: 16,
  backgroundColor: palette.brand,
  paddingHorizontal: 16,
  paddingVertical: 12,
};

const primaryButtonTextStyle = {
  color: '#ffffff',
  fontSize: 14,
  fontWeight: '600' as const,
};

const dangerButtonStyle = {
  alignItems: 'center' as const,
  borderRadius: 16,
  backgroundColor: palette.danger,
  paddingVertical: 14,
};

const dangerButtonTextStyle = {
  color: '#ffffff',
  fontSize: 15,
  fontWeight: '700' as const,
};

const errorTextStyle = {
  color: palette.danger,
  fontSize: 14,
  lineHeight: 20,
};
