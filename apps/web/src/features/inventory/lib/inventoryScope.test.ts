import { describe, expect, it } from 'vitest';
import { inventoryStorageKey, isInventoryFilterState, normalizeSavedInventoryQuery, collectInventoryPages } from '@inplace/app-core';
import type { Item } from '@inplace/domain';

const scope = { server: 'https://one.test/api', userId: 'u1', householdId: 'h1' };
const item = (id: string): Item => ({ id, household_id: 'h1' } as Item);

describe('inventory scope and completeness', () => {
  it('separates server, account and household storage', () => {
    const keys = [scope, { ...scope, server: 'https://two.test/api' }, { ...scope, userId: 'u2' }, { ...scope, householdId: 'h2' }].map(inventoryStorageKey);
    expect(new Set(keys).size).toBe(4);
  });
  it('does not save pagination and deduplicates tag order', () => {
    expect(normalizeSavedInventoryQuery('page=5&pageSize=48&tag=b&tag=a&tag=b&q=camera')).toBe('q=camera&tag=a&tag=b');
    expect(normalizeSavedInventoryQuery('page=4&pageSize=24')).toBe('');
  });
  it('rejects malformed stored filter fields', () => {
    expect(isInventoryFilterState({ q: '', type: 'all', status: 'all', locationId: null, tags: 42, view: 'flat' })).toBe(false);
    expect(isInventoryFilterState({})).toBe(false);
  });
  it('reads past the previous 5000-item cap', async () => {
    const total = 5101;
    const result = await collectInventoryPages(async ({ page, pageSize }) => ({
      data: Array.from({ length: Math.min(pageSize, total - (page - 1) * pageSize) }, (_, offset) => item(String((page - 1) * pageSize + offset))),
      meta: { page, pageSize, total, totalPages: 52, hasNextPage: page < 52 },
    }));
    expect(result).toHaveLength(total);
    expect(result.at(-1)?.id).toBe('5100');
  });
  it('rejects partial or repeated pages rather than showing incomplete totals', async () => {
    await expect(collectInventoryPages(async () => ({ data: [item('1')], meta: { page: 1, pageSize: 100, total: 2, totalPages: 1, hasNextPage: false } }))).rejects.toThrow('不完整');
    await expect(collectInventoryPages(async () => ({ data: [item('1')], meta: { page: 1, pageSize: 100, total: 200, totalPages: 2, hasNextPage: true } }))).rejects.toThrow('变化');
  });
});
