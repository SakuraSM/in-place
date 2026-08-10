import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../app/providers/auth-context';
import { useHousehold } from '../../../app/providers/household-context';
import { searchItems } from '../../../legacy/items';

const INVENTORY_STALE_TIME_MS = 60_000;

export function useAllInventoryItems(enabled = true) {
  const { user } = useAuth();
  const { currentHousehold } = useHousehold();

  return useQuery({
    queryKey: ['inventory', 'all-items', user?.id, currentHousehold?.id],
    enabled: enabled && Boolean(user?.id) && Boolean(currentHousehold?.id),
    staleTime: INVENTORY_STALE_TIME_MS,
    queryFn: async () => searchItems('', user!.id),
  });
}
