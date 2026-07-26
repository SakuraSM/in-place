import type { Item } from '@inplace/domain';
import { itemsApi } from './mobileClient';

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

export async function fetchAllMobileItems(userId: string): Promise<Item[]> {
  const collectedItems: Item[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && page <= MAX_PAGES) {
    const result = await itemsApi.searchItemsPage('', userId, { page, pageSize: PAGE_SIZE });
    collectedItems.push(...result.data);
    hasNextPage = result.meta.hasNextPage;
    page += 1;
  }

  return collectedItems;
}
