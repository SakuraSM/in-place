import { useQuery } from '@tanstack/react-query';
import type { Category, Item } from '@inplace/domain';
import { useAuth } from '../../../app/providers/auth-context';
import { useHousehold } from '../../../app/providers/household-context';
import { fetchCategories } from '../../../legacy/categories';
import { getItemCategoryScope } from '../lib/categoryScope';

export function useInventoryCategory(item: Item): Category | undefined {
  const { user } = useAuth();
  const { currentHousehold } = useHousehold();
  const categories = useQuery({
    queryKey: ['inventory', 'categories', user?.id, currentHousehold?.id],
    queryFn: () => fetchCategories(user!.id),
    enabled: Boolean(user && currentHousehold),
  });
  return categories.data?.find(candidate => candidate.name === item.category && candidate.scope === getItemCategoryScope(item));
}
