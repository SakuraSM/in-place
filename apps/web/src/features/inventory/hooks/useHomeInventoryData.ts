import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Item } from '../../../legacy/database.types';
import { fetchCategories } from '../../../legacy/categories';
import { useHousehold } from '../../../app/providers/household-context';
import { useAllInventoryItems } from './useAllInventoryItems';
import { buildItemIdMap, buildItemLineage } from '../lib/locationTree';

const EMPTY_ITEMS: Item[] = [];

export function useHomeInventoryData(userId: string | null, currentParentId: string | null) {
  const { currentHousehold } = useHousehold();
  const inventory = useAllInventoryItems(Boolean(userId));
  const categories = useQuery({
    queryKey: ['inventory', 'categories', userId, currentHousehold?.id],
    enabled: Boolean(userId && currentHousehold),
    queryFn: () => fetchCategories(userId!),
  });
  const allItems = inventory.data ?? EMPTY_ITEMS;
  const children = useMemo(() => allItems.filter((item) => item.parent_id === currentParentId), [allItems, currentParentId]);
  const childCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allItems.forEach((item) => { if (item.parent_id) counts[item.parent_id] = (counts[item.parent_id] ?? 0) + 1; });
    return counts;
  }, [allItems]);
  const breadcrumbs = useMemo(() => currentParentId ? buildItemLineage(currentParentId, buildItemIdMap(allItems)) : [], [allItems, currentParentId]);
  const loadChildren = async (_parentId: string | null): Promise<void> => {
    void _parentId;
    await inventory.refetch({ throwOnError: true });
  };
  return {
    breadcrumbs, children, childCounts, categories: categories.data ?? [],
    loading: inventory.isLoading,
    error: inventory.error ?? categories.error,
    loadChildren,
    retry: () => { void inventory.refetch(); void categories.refetch(); },
  };
}
