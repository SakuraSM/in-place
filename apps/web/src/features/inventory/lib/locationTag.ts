import type { Item } from '../../../legacy/database.types';

export const LOCATION_TAG_KEY = 'location_tag';

type InventoryNode = Pick<Item, 'type' | 'metadata'>;

export function isLocationItem(item: InventoryNode | null | undefined) {
  if (!item || item.type !== 'container') {
    return false;
  }

  return item.metadata?.[LOCATION_TAG_KEY] === true;
}

export function updateLocationMetadata(metadata: Record<string, unknown> | undefined, isLocation: boolean) {
  const nextMetadata = { ...(metadata ?? {}) };

  if (isLocation) {
    nextMetadata[LOCATION_TAG_KEY] = true;
    return nextMetadata;
  }

  delete nextMetadata[LOCATION_TAG_KEY];
  return nextMetadata;
}

export function getContainerTypeLabel(item: InventoryNode | null | undefined) {
  return isLocationItem(item) ? '位置' : '收纳';
}
