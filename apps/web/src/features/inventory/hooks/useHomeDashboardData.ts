import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActivityLogsPage } from '../../../legacy/activity';
import { fetchItemStats } from '../../../legacy/items';
import { buildItemIdMap, buildItemLineage } from '../lib/locationTree';
import { useAllInventoryItems } from './useAllInventoryItems';

export function useHomeDashboardData(userId: string | null, enabled: boolean) {
  const { data: allInventoryItems = [] } = useAllInventoryItems(enabled);
  const recentItems = useMemo(
    () => [...allInventoryItems]
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .slice(0, 3),
    [allInventoryItems],
  );
  const itemMap = useMemo(() => buildItemIdMap(allInventoryItems), [allInventoryItems]);
  const recentItemPaths = useMemo(
    () => Object.fromEntries(recentItems.map((item) => [
      item.id,
      buildItemLineage(item.id, itemMap).map((node) => node.name).join(' > '),
    ])),
    [itemMap, recentItems],
  );

  const { data: rootStats, isLoading: statsLoading } = useQuery({
    queryKey: ['home', 'stats', userId],
    enabled: Boolean(userId) && enabled,
    queryFn: () => fetchItemStats(userId!),
    staleTime: 60_000,
  });
  const { data: recentActivity = [] } = useQuery({
    queryKey: ['home', 'recent-activity', userId],
    enabled: Boolean(userId) && enabled,
    queryFn: async () => {
      const response = await fetchActivityLogsPage(userId!, { pageSize: 3 });
      return response.data;
    },
    staleTime: 30_000,
  });

  return {
    recentItems,
    recentItemPaths,
    rootStats,
    statsLoading,
    recentActivity,
  };
}
