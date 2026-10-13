import { useHousehold } from '@/providers/HouseholdProvider';
import { InventoryForm } from '@/features/inventory/form/InventoryForm';

interface HomeItemFormSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function HomeItemFormSheet({ visible, onClose }: HomeItemFormSheetProps) {
  const { currentHouseholdId } = useHousehold();
  if (!visible) return null;
  return <InventoryForm key={currentHouseholdId} presentation="sheet" onClose={onClose} onSaved={onClose} />;
}
