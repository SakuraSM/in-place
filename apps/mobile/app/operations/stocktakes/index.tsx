import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, type Href } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, Text } from 'react-native';
import type { Item } from '@inplace/domain';
import { useAuth } from '@/providers/AuthProvider';
import { itemsApi, stocktakesApi } from '@/shared/api/mobileClient';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { CompactListRow } from '@/shared/ui/CompactListRow';
import { InventoryIcon } from '@/shared/ui/InventoryIcon';
import { Screen } from '@/shared/ui/Screen';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StateBlock } from '@/shared/ui/StateBlock';
import { useNotify } from '@/shared/ui/ToastProvider';
import { palette } from '@/shared/ui/theme';

export default function StocktakesScreen() {
  const { user } = useAuth();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const sessionsQuery = useQuery({
    queryKey: ['mobile', 'stocktakes'],
    queryFn: () => stocktakesApi.listRecent(),
  });
  const locationsQuery = useQuery({
    queryKey: ['mobile', 'stocktake-locations', user?.id],
    enabled: Boolean(user) && locationPickerOpen,
    queryFn: () => fetchLocations(user!.id),
  });
  const createMutation = useMutation({
    mutationFn: (locationId: string) => stocktakesApi.create(locationId),
    onSuccess: async (session) => {
      setLocationPickerOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['mobile', 'stocktakes'] });
      notify({ tone: 'success', title: '盘点已创建', description: session.location.name });
      router.push(`/operations/stocktakes/${session.id}` as Href);
    },
    onError: (error) => notify({
      tone: 'error',
      title: '创建盘点失败',
      description: error instanceof Error ? error.message : '请稍后重试',
    }),
  });

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === 'in_progress'),
    [sessions],
  );
  const completedSessions = useMemo(
    () => sessions.filter((session) => session.status === 'completed'),
    [sessions],
  );

  if (sessionsQuery.isLoading) return <Screen><StateBlock title="加载盘点" loading /></Screen>;
  if (sessionsQuery.isError) {
    return <Screen><StateBlock title="盘点加载失败" body={sessionsQuery.error instanceof Error ? sessionsQuery.error.message : '请稍后重试'} /></Screen>;
  }

  return (
    <Screen scroll contentInsetMode="page" chrome="muted">
      <Stack.Screen options={{ title: '盘点', headerShown: true }} />
      <SectionCard title="库存盘点" subtitle="按位置核对数量、遗漏和错误归位" density="compact">
        <Pressable
          accessibilityRole="button"
          onPress={() => setLocationPickerOpen(true)}
          style={primaryButtonStyle}
        >
          <Ionicons name="add" size={19} color="#ffffff" />
          <Text style={primaryButtonTextStyle}>创建盘点</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title={`进行中 ${activeSessions.length}`} density="dense" headerMode="compact">
        {activeSessions.length === 0 ? <Text style={emptyTextStyle}>没有未完成的盘点。</Text> : null}
        {activeSessions.map((session) => (
          <CompactListRow
            key={session.id}
            title={session.location.name}
            subtitle={`${session.entries.filter((entry) => entry.counted_quantity !== null).length} / ${session.entries.length} 已核对`}
            meta="继续"
            iconName="clipboard-outline"
            onPress={() => router.push(`/operations/stocktakes/${session.id}` as Href)}
          />
        ))}
      </SectionCard>

      <SectionCard title={`最近完成 ${completedSessions.length}`} density="dense" headerMode="compact">
        {completedSessions.length === 0 ? <Text style={emptyTextStyle}>暂无已完成盘点。</Text> : null}
        {completedSessions.slice(0, 10).map((session) => (
          <CompactListRow
            key={session.id}
            title={session.location.name}
            subtitle={new Date(session.completed_at ?? session.updated_at).toLocaleString('zh-CN')}
            meta={`${session.entries.filter((entry) => entry.status === 'missing').length} 缺失`}
            iconName="checkmark-done-outline"
            onPress={() => router.push(`/operations/stocktakes/${session.id}` as Href)}
          />
        ))}
      </SectionCard>

      <BottomSheet visible={locationPickerOpen} title="选择盘点位置" onClose={() => setLocationPickerOpen(false)}>
        {locationsQuery.isLoading ? <StateBlock title="加载位置" loading /> : null}
        {!locationsQuery.isLoading && locationsQuery.data?.length === 0 ? (
          <Text style={emptyTextStyle}>请先在“位置”中创建一个空间位置。</Text>
        ) : null}
        {locationsQuery.data?.map((location) => (
          <Pressable
            key={location.id}
            disabled={createMutation.isPending}
            onPress={() => createMutation.mutate(location.id)}
          >
            <CompactListRow
              title={location.name}
              subtitle={location.category || '位置'}
              icon={<InventoryIcon type="container" isLocation size="sm" />}
              iconFramed={false}
              chevron
            />
          </Pressable>
        ))}
      </BottomSheet>
    </Screen>
  );
}

async function fetchLocations(userId: string) {
  const collectedLocations: Item[] = [];
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage && page <= 20) {
    const result = await itemsApi.searchItemsPage('', userId, {
      page,
      pageSize: 100,
      type: 'container',
      locationOnly: true,
    });
    collectedLocations.push(...result.data);
    hasNextPage = result.meta.hasNextPage;
    page += 1;
  }
  return collectedLocations;
}

const primaryButtonStyle = {
  minHeight: 48,
  borderRadius: 16,
  backgroundColor: palette.brand,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: 8,
};
const primaryButtonTextStyle = { fontSize: 15, fontWeight: '900' as const, color: '#ffffff' };
const emptyTextStyle = { fontSize: 14, color: palette.textSoft };
