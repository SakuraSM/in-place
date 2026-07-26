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
      items: groupItems,
    }))
    .sort((left, right) => right.items.length - left.items.length);
}

export function buildInventoryReport(
  items: Item[],
  stocktakes: StocktakeSession[] = [],
  now = new Date(),
): InventoryReport {
  const expiryBoundary = new Date(now);
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
    .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())[0];

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
      const expiryDate = new Date(item.expiry_date);
      return expiryDate >= now && expiryDate <= expiryBoundary;
    }),
    warrantyCoveredItems: itemRecords.filter((item) => (
      Boolean(item.warranty_date) && new Date(item.warranty_date!).getTime() >= now.getTime()
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
