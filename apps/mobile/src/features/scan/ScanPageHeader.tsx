import { BrandHeader } from '@/shared/ui/BrandHeader';
import { Entrance } from '@/shared/ui/Entrance';
import { HouseholdButton } from '@/shared/ui/HouseholdButton';

export function ScanPageHeader() {
  return (
    <Entrance variant="page">
      <BrandHeader title="拍照录入" variant="page" accessory={<HouseholdButton compact />} />
    </Entrance>
  );
}
