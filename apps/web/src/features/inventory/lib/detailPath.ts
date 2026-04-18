import type { Item } from '../../../legacy/database.types';

export function resolveItemDetailPath(item: Pick<Item, 'id' | 'type'>) {
  return item.type === 'container' ? `/container/${item.id}` : `/item/${item.id}`;
}
