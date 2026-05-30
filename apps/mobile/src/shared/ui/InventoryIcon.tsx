import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { View, type ViewStyle } from 'react-native';
import type { ItemType } from '@inplace/domain';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type InventoryIconSize = 'sm' | 'md' | 'lg' | 'xl';
type InventoryIconKind = 'item' | 'container' | 'location';

interface InventoryIconProps {
  type: ItemType;
  isLocation?: boolean;
  size?: InventoryIconSize;
  style?: ViewStyle;
}

interface InventoryIconToken {
  iconName: IoniconName;
  iconColor: string;
  backgroundColor: string;
  haloColor: string;
}

const INVENTORY_ICON_TOKENS: Record<InventoryIconKind, InventoryIconToken> = {
  item: {
    iconName: 'cube',
    iconColor: '#d97706',
    backgroundColor: '#fff4d6',
    haloColor: '#ffe8a3',
  },
  container: {
    iconName: 'file-tray-stacked',
    iconColor: '#0d9488',
    backgroundColor: '#ddfbf0',
    haloColor: '#b8f3df',
  },
  location: {
    iconName: 'location',
    iconColor: '#16a34a',
    backgroundColor: '#e8f8ed',
    haloColor: '#c8f0d2',
  },
};

const INVENTORY_ICON_SIZE_STYLES: Record<InventoryIconSize, { box: number; radius: number; icon: number; halo: number }> = {
  sm: { box: 34, radius: 12, icon: 18, halo: 20 },
  md: { box: 46, radius: 16, icon: 24, halo: 28 },
  lg: { box: 58, radius: 19, icon: 30, halo: 36 },
  xl: { box: 96, radius: 24, icon: 42, halo: 54 },
};

export function InventoryIcon({
  type,
  isLocation = false,
  size = 'md',
  style,
}: InventoryIconProps) {
  const kind = resolveInventoryIconKind({ type, isLocation });
  const token = INVENTORY_ICON_TOKENS[kind];
  const sizeStyle = INVENTORY_ICON_SIZE_STYLES[size];

  return (
    <View
      style={[
        iconFrameStyle,
        {
          width: sizeStyle.box,
          height: sizeStyle.box,
          borderRadius: sizeStyle.radius,
          backgroundColor: token.backgroundColor,
        },
        style,
      ]}
    >
      <View
        style={[
          iconHaloStyle,
          {
            width: sizeStyle.halo,
            height: sizeStyle.halo,
            borderRadius: sizeStyle.halo / 2,
            backgroundColor: token.haloColor,
          },
        ]}
      />
      <Ionicons name={token.iconName} size={sizeStyle.icon} color={token.iconColor} />
    </View>
  );
}

export function InventoryThumbFallback(props: InventoryIconProps) {
  return <InventoryIcon {...props} />;
}

function resolveInventoryIconKind({
  type,
  isLocation,
}: {
  type: ItemType;
  isLocation: boolean;
}): InventoryIconKind {
  if (type === 'item') {
    return 'item';
  }

  return isLocation ? 'location' : 'container';
}

const iconFrameStyle = {
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  overflow: 'hidden' as const,
};

const iconHaloStyle = {
  position: 'absolute' as const,
  right: -4,
  top: -3,
  opacity: 0.82,
};
