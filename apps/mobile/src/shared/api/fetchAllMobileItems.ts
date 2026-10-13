import type { Item } from '@inplace/domain';
import { itemsApi } from './mobileClient';

export async function fetchAllMobileItems(userId: string): Promise<Item[]> {
  return itemsApi.searchItems('', userId);
}
