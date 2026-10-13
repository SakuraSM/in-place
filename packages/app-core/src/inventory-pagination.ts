import type { Item, PaginatedResult } from '@inplace/domain';

const INVENTORY_PAGE_SIZE = 100;

export async function collectInventoryPages(
  fetchPage: (pagination: { page: number; pageSize: number }) => Promise<PaginatedResult<Item>>,
): Promise<Item[]> {
  const collected: Item[] = [];
  const seenIds = new Set<string>();
  let expectedTotal: number | undefined;
  let householdId: string | undefined;
  for (let page = 1; ; page += 1) {
    const result = await fetchPage({ page, pageSize: INVENTORY_PAGE_SIZE });
    expectedTotal ??= result.meta.total;
    householdId ??= result.data[0]?.household_id;
    const pageIds = new Set(result.data.map((item) => item.id));
    if (result.meta.total !== expectedTotal || pageIds.size !== result.data.length || result.data.some((item) => seenIds.has(item.id) || item.household_id !== householdId)) {
      throw new Error('库存或家庭已变化，请刷新后重试');
    }
    result.data.forEach((item) => seenIds.add(item.id));
    collected.push(...result.data);
    if (!result.meta.hasNextPage) {
      if (collected.length !== expectedTotal) throw new Error('库存读取不完整，请重试');
      return collected;
    }
    if (!result.data.length || collected.length >= expectedTotal) throw new Error('库存分页异常，请重试');
  }
}
