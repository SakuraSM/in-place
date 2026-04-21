import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../app/providers/AuthContext';
import { searchItems } from '../../../legacy/items';

export function useAllInventoryItems(enabled = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory', 'all-items', user?.id],
    enabled: enabled && Boolean(user?.id),
    staleTime: 1000 * 60,
    queryFn: async () => searchItems('', user!.id),
  });
}
