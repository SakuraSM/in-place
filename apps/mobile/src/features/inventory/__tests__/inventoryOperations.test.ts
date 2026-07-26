import {
  buildInventoryReport,
  groupDuplicateInventory,
  parseInventoryCode,
} from '@inplace/app-core';
import type { Item } from '@inplace/domain';

function createItem(id: string, overrides: Partial<Item> = {}): Item {
  return {
    id,
    user_id: 'user-1',
    household_id: 'household-1',
    parent_id: null,
    type: 'item',
    name: '充电线',
    description: '',
    category: '数码',
    price: 10,
    quantity: 2,
    tracking_mode: 'quantity',
    minimum_quantity: 3,
    expiry_date: null,
    purchase_date: null,
    warranty_date: null,
    status: 'in_stock',
    images: [],
    tags: [],
    metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('inventory operations', () => {
  it('groups normalized duplicate names by type and category', () => {
    const groups = groupDuplicateInventory([
      createItem('1', { name: ' 充电线 ' }),
      createItem('2', { name: '充电线' }),
      createItem('3', { category: '工具' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((item) => item.id)).toEqual(['1', '2']);
  });

  it('aggregates value and replenishment metrics', () => {
    const report = buildInventoryReport([
      createItem('1'),
      createItem('2', { price: 20, quantity: 1, minimum_quantity: null }),
    ], [], new Date('2026-01-01T00:00:00.000Z'));

    expect(report.totalValue).toBe(40);
    expect(report.lowStockItems.map((item) => item.id)).toEqual(['1']);
  });

  it('parses public inventory links but rejects UUIDs', () => {
    const code = 'AbCdEfGhIjKlMnOpQrStUv';
    expect(parseInventoryCode(`https://example.com/s/${code}`)).toBe(code);
    expect(parseInventoryCode('7f9b2d52-8e73-4c61-bfea-469984b617ad')).toBeNull();
  });
});
