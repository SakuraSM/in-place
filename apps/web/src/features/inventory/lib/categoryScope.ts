import type { CategoryScope, Item } from '../../../legacy/database.types';
import { isLocationItem } from './locationTag';

export function getItemCategoryScope(item: Pick<Item, 'type' | 'metadata'>): CategoryScope {
  if (item.type === 'item') return 'item';
  return isLocationItem(item) ? 'location' : 'container';
}

export function getFormCategoryScope(type: Item['type'], isLocation: boolean): CategoryScope {
  if (type === 'item') return 'item';
  return isLocation ? 'location' : 'container';
}
