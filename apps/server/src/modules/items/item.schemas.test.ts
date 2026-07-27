import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { items } from '@inplace/db';
import { createItemSchema } from './item.schemas.js';

describe('item date fields', () => {
  it('keeps the Drizzle schema aligned with date columns created by migrations', () => {
    const columns = getTableColumns(items);

    expect(columns.expiryDate.getSQLType()).toBe('date');
    expect(columns.purchaseDate.getSQLType()).toBe('date');
    expect(columns.warrantyDate.getSQLType()).toBe('date');
  });

  it('normalizes legacy ISO timestamps to date-only API values', () => {
    const parsed = createItemSchema.parse({
      name: '日期测试物品',
      purchaseDate: '2026-07-28T00:00:00.000Z',
      warrantyDate: '2027-07-28',
    });

    expect(parsed.purchaseDate).toBe('2026-07-28');
    expect(parsed.warrantyDate).toBe('2027-07-28');
  });

  it('rejects calendar dates that roll into another month', () => {
    const parsed = createItemSchema.parse({
      name: '非法日期测试物品',
      purchaseDate: '2026-02-31',
    });

    expect(parsed.purchaseDate).toBeNull();
  });
});
