import { useState, type ReactElement } from 'react';
import type { Category, Item } from '@inplace/domain';
import { InventoryImage } from '@/features/inventory/InventoryImage';
import { resolveInventoryImageUri } from '@/features/inventory/mobileInventoryFormat';
import { isLocationItem } from '@/shared/lib/location';
import { CategoryArtwork } from '@/shared/ui/CategoryArtwork';
import { InventoryIcon } from '@/shared/ui/InventoryIcon';

interface OverviewResultArtworkProps {
  item: Item;
  category?: Category;
  presentation: 'row' | 'card';
}

/** Photo errors use the same fallback in both inventory presentations. */
export function OverviewResultArtwork({ item, category, presentation }: OverviewResultArtworkProps): ReactElement {
  const [failedImageUri, setFailedImageUri] = useState<string | null>(null);
  const imageUri = resolveInventoryImageUri(item.images[0]);
  if (imageUri && imageUri !== failedImageUri) {
    return <InventoryImage url={item.images[0]} onError={() => setFailedImageUri(imageUri)} resizeMode="cover" style={{ width: '100%', height: '100%' }} />;
  }
  if (category) {
    return (
      <CategoryArtwork
        presetKey={category.preset_key}
        icon={category.icon}
        color={category.color}
        size={presentation === 'card' ? 'card' : 'md'}
        style={presentation === 'card' ? { width: '100%', height: '100%', borderRadius: 0, backgroundColor: 'transparent' } : undefined}
      />
    );
  }
  return <InventoryIcon type={item.type} isLocation={isLocationItem(item)} size={presentation === 'card' ? 'lg' : 'md'} />;
}
