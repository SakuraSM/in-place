import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHousehold } from '@/providers/HouseholdProvider';
import { itemsApi } from '@/shared/api/mobileClient';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Screen } from '@/shared/ui/Screen';
import { StateBlock } from '@/shared/ui/StateBlock';
import { InventoryForm } from '@/features/inventory/form/InventoryForm';

function closeForm(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}

export default function ItemFormScreen() {
  const { id, parentId, type } = useLocalSearchParams<{ id?: string; parentId?: string; type?: string }>();
  const { currentHouseholdId } = useHousehold();
  const itemQuery = useQuery({
    queryKey: ['mobile', 'edit-item', currentHouseholdId, id],
    enabled: Boolean(id && currentHouseholdId),
    queryFn: () => itemsApi.fetchItem(id!),
  });
  if (id && (itemQuery.isLoading || itemQuery.isError || !itemQuery.data)) {
    return <Screen chrome="none">
      <PageHeader title="编辑库存" onBack={closeForm} />
      <StateBlock title={itemQuery.isLoading ? '加载表单' : '无法打开物品'} loading={itemQuery.isLoading} body={itemQuery.isError ? '加载失败，请返回后重试。' : itemQuery.isLoading ? undefined : '物品不存在或不属于当前家庭。'} />
    </Screen>;
  }
  return <>
    <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
    <InventoryForm key={`${currentHouseholdId}:${id ?? 'new'}`} presentation="screen" item={id ? itemQuery.data ?? undefined : undefined} parentId={parentId} type={type === 'container' ? 'container' : 'item'} onClose={closeForm} onSaved={(item) => router.replace(`/item/${item.id}`)} />
  </>;
}
