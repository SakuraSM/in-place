import type { Item } from '@inplace/domain';

export const LOCATION_TAG_KEY = 'location_tag';

export function isLocationItem(item: Pick<Item, 'type' | 'metadata'> | null | undefined) {
  return item?.type === 'container' && item.metadata?.[LOCATION_TAG_KEY] === true;
}

export function getContainerTypeLabel(item: Pick<Item, 'type' | 'metadata'> | null | undefined) {
  return isLocationItem(item) ? '位置' : '收纳';
}

export function buildChildrenMap(items: Item[]) {
  return items.reduce<Map<string | null, Item[]>>((map, item) => {
    const key = item.parent_id ?? null;
    const siblings = map.get(key) ?? [];
    siblings.push(item);
    map.set(key, siblings);
    return map;
  }, new Map());
}

export function countLocationContents(items: Item[], locationId: string) {
  const childrenMap = buildChildrenMap(items);
  const stack = [...(childrenMap.get(locationId) ?? [])];
  const stats = {
    locations: 0,
    containers: 0,
    items: 0,
    total: 0,
  };

  while (stack.length > 0) {
    const child = stack.pop()!;
    stats.total += 1;

    if (child.type === 'item') {
      stats.items += 1;
      continue;
    }

    if (isLocationItem(child)) {
      stats.locations += 1;
    } else {
      stats.containers += 1;
    }

    stack.push(...(childrenMap.get(child.id) ?? []));
  }

  return stats;
}
