import { useHousehold } from '../../app/providers/household-context';

export function useInventoryPermissions(): { canEditInventory: boolean; canManageHousehold: boolean } {
  const { currentHousehold } = useHousehold();
  return {
    canEditInventory: currentHousehold?.role === 'owner' || currentHousehold?.role === 'editor',
    canManageHousehold: currentHousehold?.role === 'owner',
  };
}
