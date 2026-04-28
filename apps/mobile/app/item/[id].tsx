import { Link, router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import { itemsApi } from '@/shared/api/mobileClient';
import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { getContainerTypeLabel } from '@/shared/lib/location';
import { palette } from '@/shared/ui/theme';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
        subtitle={`${item.type === 'container' ? getContainerTypeLabel(item) : '物品'} · ${item.status}`}
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
              <Link key={child.id} href={`/item/${child.id}`} asChild>
                <Pressable style={rowStyle}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={listTitleStyle}>{child.name}</Text>
                    <Text style={bodyStyle}>
                      {child.type === 'container' ? getContainerTypeLabel(child) : '物品'}{child.category ? ` · ${child.category}` : ''}
                    </Text>
                  </View>
                  <Text style={hintStyle}>{child.status}</Text>
                </Pressable>
              </Link>
            ))
          )}
        </SectionCard>
      ) : null}
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
