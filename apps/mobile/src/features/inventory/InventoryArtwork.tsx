import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import type { Category, Item } from '@inplace/domain';
import { CategoryArtwork } from '@/shared/ui/CategoryArtwork';
import { isLocationItem } from '@/shared/lib/location';
import { palette } from '@/shared/ui/theme';

interface InventoryArtworkProps { item: Item; category?: Category }

export function InventoryArtwork({ item, category }: InventoryArtworkProps) {
  const scope = item.type === 'item' ? 'item' : isLocationItem(item) ? 'location' : 'container';
  return <View accessible={false} style={{ height: 230, borderRadius: 20, backgroundColor: palette.canvasStrong, alignItems: 'center', justifyContent: 'center' }}>
    {category ? <CategoryArtwork presetKey={category.preset_key} icon={category.icon} color={category.color} size="card" style={{ width: 190, height: 190, backgroundColor: 'transparent' }} /> : <Ionicons name={scope === 'location' ? 'home-outline' : 'cube-outline'} size={64} color={palette.brandStrong} />}
  </View>;
}
