import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import { groupDuplicateInventory, type DuplicateInventoryGroup } from '@inplace/app-core';
import { useAuth } from '@/providers/AuthProvider';
import { useHousehold } from '@/providers/HouseholdProvider';
import { PageHeader } from '@/shared/ui/PageHeader';
import { fetchAllMobileItems } from '@/shared/api/fetchAllMobileItems';
import { mobileApiClient } from '@/shared/api/mobileClient';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { useNotify } from '@/shared/ui/ToastProvider';
import { palette } from '@/shared/ui/theme';

export default function DuplicatesScreen() {
  const { user } = useAuth();
  const { canEditInventory, currentHouseholdId } = useHousehold();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [targetGroup, setTargetGroup] = useState<DuplicateInventoryGroup | null>(null);
  const itemsQuery = useQuery({
    queryKey: ['mobile', 'duplicate-items', currentHouseholdId, user?.id],
    enabled: Boolean(user),
    queryFn: () => fetchAllMobileItems(user!.id),
  });
  const groups = useMemo(
    () => groupDuplicateInventory((itemsQuery.data ?? []).filter((item) => item.type === 'item')),
    [itemsQuery.data],
  );
  const mergeMutation = useMutation({
    mutationFn: async (group: DuplicateInventoryGroup) => {
      const [primaryItem, ...duplicateItems] = group.items;
      await mobileApiClient.request('/v1/items/merge', {
        method: 'POST',
        body: JSON.stringify({
          primaryItemId: primaryItem.id,
          duplicateItemIds: duplicateItems.map((item) => item.id),
        }),
      });
    },
    onSuccess: async () => {
      const mergedCount = targetGroup?.items.length ?? 0;
      setTargetGroup(null);
      await Promise.all([
        itemsQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ['mobile', 'home'] }),
      ]);
      notify({ tone: 'success', title: `已合并 ${mergedCount} 条记录` });
    },
    onError: (error) => notify({
      tone: 'error',
      title: '合并失败，原记录均已保留',
      description: error instanceof Error ? error.message : '请稍后重试',
    }),
  });

  if (itemsQuery.isLoading) return <Screen><StateBlock title="检测重复项" loading /></Screen>;
  if (itemsQuery.isError) {
    return <Screen><StateBlock title="重复项加载失败" body={itemsQuery.error instanceof Error ? itemsQuery.error.message : '请稍后重试'} /></Screen>;
  }

  return (
    <Screen scroll contentInsetMode="page" chrome="muted">
      <PageHeader title="重复项" subtitle="检查并合并相似库存记录" />
      <SectionCard title={`重复物品检测 · ${groups.length} 组`} subtitle="按类型、规范化名称和类别识别" density="compact">
        {groups.length === 0 ? <Text style={emptyTextStyle}>没有发现同名同类别的重复记录。</Text> : null}
        {groups.map((group) => (
          <View key={group.key} style={groupStyle}>
            <View style={groupTitleRowStyle}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={titleStyle}>{group.items[0].name}</Text>
                <Text style={metaStyle}>{group.category || '未分类'} · {group.items.length} 条 · 数量 {group.items.reduce((sum, item) => sum + item.quantity, 0)}</Text>
              </View>
              {canEditInventory ? <Pressable onPress={() => setTargetGroup(group)} style={mergeButtonStyle}>
                <Text style={mergeButtonTextStyle}>合并</Text>
              </Pressable> : null}
            </View>
            {group.items.map((item, index) => (
              <Text key={item.id} style={recordStyle}>{index === 0 ? '保留' : '移除'} · 数量 {item.quantity} · {new Date(item.created_at).toLocaleDateString('zh-CN')}</Text>
            ))}
          </View>
        ))}
      </SectionCard>
      <ConfirmDialog
        visible={Boolean(targetGroup)}
        title="合并重复记录"
        message={`保留最早记录并合并其余 ${Math.max((targetGroup?.items.length ?? 1) - 1, 0)} 条？此操作不可撤销。`}
        confirmLabel={mergeMutation.isPending ? '合并中…' : '确认合并'}
        loading={mergeMutation.isPending}
        onCancel={() => setTargetGroup(null)}
        onConfirm={() => {
          if (targetGroup) mergeMutation.mutate(targetGroup);
        }}
      />
    </Screen>
  );
}

const emptyTextStyle = { fontSize: 14, lineHeight: 20, color: palette.textSoft };
const groupStyle = { gap: 8, borderTopWidth: 1, borderTopColor: palette.borderSoft, paddingTop: 12 };
const groupTitleRowStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 };
const titleStyle = { fontSize: 16, fontWeight: '900' as const, color: palette.text };
const metaStyle = { fontSize: 12, color: palette.textSoft };
const recordStyle = { fontSize: 13, color: palette.textMuted };
const mergeButtonStyle = { borderRadius: 12, backgroundColor: palette.brandStrong, paddingHorizontal: 13, paddingVertical: 9 };
const mergeButtonTextStyle = { fontSize: 13, fontWeight: '900' as const, color: '#ffffff' };
