import type { CategoryScope, Item, StocktakeSession } from '@inplace/domain';

export interface DuplicateInventoryGroup {
  key: string;
  type: Item['type'];
  category: string;
  normalizedName: string;
  items: Item[];
}

export interface InventoryReport {
  totalItems: number;
  totalContainers: number;
  totalQuantity: number;
  totalValue: number;
  lowStockItems: Item[];
  expiringItems: Item[];
  expiredItems: Item[];
  warrantyCoveredItems: Item[];
  latestStocktakeMissingCount: number;
  valueByCategory: Array<{ category: string; value: number }>;
}

export interface InventoryFilterState {
  q: string;
  type: 'all' | 'location' | Item['type'];
  status: 'all' | Item['status'];
  locationId: string | null;
  tags: string[];
  view: 'hierarchy' | 'flat';
}

const CODE_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_EXPIRY_WINDOW_DAYS = 30;

export function normalizeInventoryName(name: string) {
  return name.trim().toLocaleLowerCase('zh-CN').replace(/\s+/g, ' ');
}

export function getDuplicateInventoryKey(item: Pick<Item, 'type' | 'name' | 'category'>) {
  return [
    item.type,
    normalizeInventoryName(item.name),
    normalizeInventoryName(item.category),
  ].join(':');
}

export function groupDuplicateInventory(items: Item[]): DuplicateInventoryGroup[] {
  const groupedItems = new Map<string, Item[]>();
  items.forEach((item) => {
    const key = getDuplicateInventoryKey(item);
    groupedItems.set(key, [...(groupedItems.get(key) ?? []), item]);
  });

  return [...groupedItems.entries()]
    .filter(([, groupItems]) => groupItems.length > 1)
    .map(([key, groupItems]) => ({
      key,
      type: groupItems[0].type,
      category: groupItems[0].category,
      normalizedName: normalizeInventoryName(groupItems[0].name),
      items: [...groupItems].sort((left, right) => left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id)),
    }))
    .sort((left, right) => right.items.length - left.items.length);
}

export function buildInventoryReport(
  items: Item[],
  stocktakes: StocktakeSession[] = [],
  now = new Date(),
): InventoryReport {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryBoundary = new Date(startOfToday);
  expiryBoundary.setDate(expiryBoundary.getDate() + DEFAULT_EXPIRY_WINDOW_DAYS);
  const itemRecords = items.filter((item) => item.type === 'item');
  const totalValue = itemRecords.reduce(
    (sum, item) => sum + (item.price ?? 0) * Math.max(item.quantity, 0),
    0,
  );
  const categoryValues = new Map<string, number>();

  itemRecords.forEach((item) => {
    const category = item.category.trim() || '未分类';
    const itemValue = (item.price ?? 0) * Math.max(item.quantity, 0);
    categoryValues.set(category, (categoryValues.get(category) ?? 0) + itemValue);
  });

  const latestCompletedStocktake = stocktakes
    .filter((stocktake) => stocktake.status === 'completed')
    .sort((left, right) => new Date(right.completed_at ?? right.updated_at).getTime() - new Date(left.completed_at ?? left.updated_at).getTime())[0];

  return {
    totalItems: itemRecords.length,
    totalContainers: items.length - itemRecords.length,
    totalQuantity: itemRecords.reduce((sum, item) => sum + Math.max(item.quantity, 0), 0),
    totalValue,
    lowStockItems: itemRecords.filter((item) => (
      item.minimum_quantity !== null && item.quantity <= item.minimum_quantity
    )),
    expiringItems: itemRecords.filter((item) => {
      if (!item.expiry_date) return false;
      const expiryDate = new Date(`${item.expiry_date.slice(0, 10)}T00:00:00`);
      return expiryDate >= startOfToday && expiryDate <= expiryBoundary;
    }),
    expiredItems: itemRecords.filter((item) => item.expiry_date && new Date(`${item.expiry_date.slice(0, 10)}T00:00:00`) < startOfToday),
    warrantyCoveredItems: itemRecords.filter((item) => (
      Boolean(item.warranty_date) && new Date(`${item.warranty_date!.slice(0, 10)}T00:00:00`).getTime() >= startOfToday.getTime()
    )),
    latestStocktakeMissingCount: latestCompletedStocktake?.entries.filter(
      (entry) => entry.status === 'missing',
    ).length ?? 0,
    valueByCategory: [...categoryValues.entries()]
      .map(([category, value]) => ({ category, value }))
      .sort((left, right) => right.value - left.value),
  };
}

export function parseInventoryCode(value: string) {
  const trimmedValue = value.trim();
  const pathMatch = trimmedValue.match(/(?:^|\/)s\/([A-Za-z0-9_-]{20,64})(?:[/?#]|$)/);
  const code = pathMatch?.[1] ?? trimmedValue;
  return CODE_PATTERN.test(code) && !UUID_PATTERN.test(code) ? code : null;
}

export function getScopeLabel(scope: CategoryScope) {
  if (scope === 'location') return '位置';
  if (scope === 'container') return '收纳';
  return '物品';
}
