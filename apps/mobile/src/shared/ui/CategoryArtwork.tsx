import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ComponentProps } from 'react';
import {
  Image,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  resolveCategoryVisual,
  type CategoryPresetArtworkKey,
} from '@inplace/ui/category-artwork';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
export type CategoryArtworkSize = 'xs' | 'sm' | 'md' | 'card';

interface CategoryArtworkProps {
  presetKey?: string | null;
  icon: string;
  color?: string;
  size?: CategoryArtworkSize;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

const PRESET_SOURCES: Record<CategoryPresetArtworkKey, ImageSourcePropType> = {
  'location.apartment': require('../../../../../packages/ui/src/assets/category-presets/location-apartment.png'),
  'location.room': require('../../../../../packages/ui/src/assets/category-presets/location-room.png'),
  'location.floor': require('../../../../../packages/ui/src/assets/category-presets/location-floor.png'),
  'location.outdoor': require('../../../../../packages/ui/src/assets/category-presets/location-outdoor.png'),
  'location.garage': require('../../../../../packages/ui/src/assets/category-presets/location-garage.png'),
  'container.cabinet': require('../../../../../packages/ui/src/assets/category-presets/container-cabinet.png'),
  'container.drawer': require('../../../../../packages/ui/src/assets/category-presets/container-drawer.png'),
  'container.box': require('../../../../../packages/ui/src/assets/category-presets/container-box.png'),
  'container.shelf': require('../../../../../packages/ui/src/assets/category-presets/container-shelf.png'),
  'container.fridge': require('../../../../../packages/ui/src/assets/category-presets/container-fridge.png'),
  'container.bag': require('../../../../../packages/ui/src/assets/category-presets/container-bag.png'),
  'item.digital': require('../../../../../packages/ui/src/assets/category-presets/item-digital.png'),
  'item.clothing': require('../../../../../packages/ui/src/assets/category-presets/item-clothing.png'),
  'item.books': require('../../../../../packages/ui/src/assets/category-presets/item-books.png'),
  'item.kitchen': require('../../../../../packages/ui/src/assets/category-presets/item-kitchen.png'),
  'item.appliances': require('../../../../../packages/ui/src/assets/category-presets/item-appliances.png'),
  'item.tools': require('../../../../../packages/ui/src/assets/category-presets/item-tools.png'),
  'item.cleaning': require('../../../../../packages/ui/src/assets/category-presets/item-cleaning.png'),
  'item.health': require('../../../../../packages/ui/src/assets/category-presets/item-health.png'),
  'item.toys': require('../../../../../packages/ui/src/assets/category-presets/item-toys.png'),
  'item.valuables': require('../../../../../packages/ui/src/assets/category-presets/item-valuables.png'),
};

const SIZE_TOKENS: Record<CategoryArtworkSize, { box: number; radius: number; icon: number; inset: number }> = {
  xs: { box: 22, radius: 7, icon: 13, inset: 2 },
  sm: { box: 34, radius: 11, icon: 18, inset: 3 },
  md: { box: 48, radius: 15, icon: 23, inset: 4 },
  card: { box: 104, radius: 24, icon: 38, inset: 8 },
};

const COLOR_BACKGROUNDS: Record<string, string> = {
  sky: '#eaf6ff',
  teal: '#e5f8f4',
  emerald: '#eaf8ef',
  amber: '#fff5dc',
  rose: '#fff0f2',
  slate: '#f1f5f9',
  violet: '#f3efff',
  orange: '#fff0e5',
};

const LUCIDE_TO_IONICON: Record<string, IoniconName> = {
  Building2: 'business-outline',
  DoorOpen: 'enter-outline',
  Layers: 'layers-outline',
  TentTree: 'leaf-outline',
  Car: 'car-outline',
  Archive: 'file-tray-stacked-outline',
  Box: 'cube-outline',
  Grid2x2: 'grid-outline',
  Refrigerator: 'snow-outline',
  ShoppingBag: 'bag-handle-outline',
  MonitorSmartphone: 'phone-portrait-outline',
  Shirt: 'shirt-outline',
  BookOpen: 'book-outline',
  Utensils: 'restaurant-outline',
  Tv: 'tv-outline',
  Wrench: 'build-outline',
  Sparkles: 'sparkles-outline',
  Pill: 'medkit-outline',
  ToyBrick: 'extension-puzzle-outline',
  Gift: 'gift-outline',
};

export function CategoryArtwork({
  presetKey,
  icon,
  color = 'slate',
  size = 'sm',
  style,
  imageStyle,
}: CategoryArtworkProps) {
  const visual = resolveCategoryVisual({ presetKey, icon });
  const source = visual.kind === 'preset'
    ? PRESET_SOURCES[visual.presetKey]
    : visual.kind === 'customImage'
      ? { uri: visual.uri }
      : null;
  const sourceKey = visual.kind === 'preset'
    ? visual.presetKey
    : visual.kind === 'customImage'
      ? visual.uri
      : null;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const token = SIZE_TOKENS[size];

  useEffect(() => {
    if (failedSource && failedSource !== sourceKey) {
      setFailedSource(null);
    }
  }, [failedSource, sourceKey]);

  const fallbackIcon = visual.kind === 'preset' ? visual.artwork.legacyIcon : icon;
  const shouldRenderImage = source && sourceKey !== failedSource;

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          width: token.box,
          height: token.box,
          borderRadius: token.radius,
          overflow: 'hidden',
          backgroundColor: COLOR_BACKGROUNDS[color] ?? COLOR_BACKGROUNDS.slate,
        },
        style,
      ]}
    >
      {shouldRenderImage ? (
        <Image
          source={source}
          accessible={false}
          resizeMode={visual.kind === 'preset' ? 'contain' : 'cover'}
          onError={() => {
            if (sourceKey) setFailedSource(sourceKey);
          }}
          style={[
            {
              width: '100%',
              height: '100%',
              transform: visual.kind === 'preset' ? [{ scale: 0.94 }] : undefined,
            },
            imageStyle,
          ]}
        />
      ) : (
        <Ionicons
          name={LUCIDE_TO_IONICON[fallbackIcon] ?? 'shapes-outline'}
          size={token.icon}
          color="#0f766e"
        />
      )}
    </View>
  );
}

export { PRESET_SOURCES as CATEGORY_ARTWORK_SOURCES };
