import type { Item, ItemStatus, ItemType } from '@inplace/domain';
import { itemsApi } from '@/shared/api/mobileClient';

const ALL_ITEMS_PAGE_SIZE = 100;
const ALL_ITEMS_MAX_PAGES = 20;

export type TypeFilterValue = ItemType | 'all' | 'location';

export async function fetchAllOverviewItems(userId: string) {
  const collectedItems: Item[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && page <= ALL_ITEMS_MAX_PAGES) {
    const response = await itemsApi.searchItemsPage('', userId, { page, pageSize: ALL_ITEMS_PAGE_SIZE });
    collectedItems.push(...response.data);
    hasNextPage = response.meta.hasNextPage;
    page += 1;
  }

  return collectedItems;
}

export function buildAvailableTags(items: Item[]) {
  const tagCounts = items.reduce<Record<string, number>>((counts, item) => {
    for (const tag of item.tags) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
    return counts;
  }, {});

  return Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
}

export function normalizeTypeFilter(value: TypeFilterValue | undefined, validValues: Set<TypeFilterValue>) {
  return value && validValues.has(value) ? value : 'all';
}

export function normalizeStatusFilter(value: ItemStatus | 'all' | undefined, validValues: Set<ItemStatus | 'all'>) {
  return value && validValues.has(value) ? value : 'all';
}

export function normalizeTags(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
