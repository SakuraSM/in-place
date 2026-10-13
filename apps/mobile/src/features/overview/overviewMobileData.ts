import type { Item, ItemStatus, ItemType } from '@inplace/domain';
import { itemsApi } from '@/shared/api/mobileClient';
import { isLocationItem } from '@/shared/lib/location';

export type TypeFilterValue = ItemType | 'all' | 'location';

export async function fetchAllOverviewItems(userId: string): Promise<Item[]> {
  return itemsApi.searchItems('', userId);
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

export function buildHierarchyItems({
  items,
  parentId,
  query,
  typeFilter,
  statusFilter,
  selectedTags,
}: {
  items: Item[];
  parentId: string | null;
  query: string;
  typeFilter: TypeFilterValue;
  statusFilter: ItemStatus | 'all';
  selectedTags: string[];
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');

  return items.filter((item) => {
    if ((item.parent_id ?? null) !== parentId) {
      return false;
    }

    if (!matchesTypeFilter(item, typeFilter)) {
      return false;
    }

    if (item.type === 'item' && statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }

    if (selectedTags.length > 0 && !selectedTags.some((tag) => item.tags.includes(tag))) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [item.name, item.description, item.category, ...item.tags]
      .some((value) => value.toLocaleLowerCase('zh-CN').includes(normalizedQuery));
  });
}

function matchesTypeFilter(item: Item, typeFilter: TypeFilterValue) {
  if (typeFilter === 'all') {
    return true;
  }

  if (typeFilter === 'location') {
    return isLocationItem(item);
  }

  return item.type === typeFilter;
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
