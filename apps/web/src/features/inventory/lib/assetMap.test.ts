import { describe, expect, it } from 'vitest';
import type { Item } from '@inplace/domain';
import {
  buildAssetMapProjection,
} from './assetMap';
import {
  ASSET_MAP_ALL_FILTER,
  filterAssetMapProjection,
  findAssetMapMatches,
  type AssetMapFilters,
} from './assetMapFilters';

const DEFAULT_FILTERS: AssetMapFilters = {
  query: '',
  type: ASSET_MAP_ALL_FILTER,
  status: ASSET_MAP_ALL_FILTER,
  category: ASSET_MAP_ALL_FILTER,
};

const LARGE_INVENTORY_SIZE = 1000;
const LARGE_INVENTORY_CONTAINER_COUNT = 200;
const LARGE_INVENTORY_BRANCH_FACTOR = 5;

function createItem(input: Partial<Item> & Pick<Item, 'id' | 'name'>): Item {
  return {
    id: input.id,
    user_id: input.user_id ?? 'user-1',
    household_id: input.household_id ?? 'household-1',
    parent_id: input.parent_id ?? null,
    type: input.type ?? 'item',
    name: input.name,
    description: input.description ?? '',
    category: input.category ?? '',
    price: input.price ?? null,
    quantity: input.quantity ?? 1,
    tracking_mode: input.tracking_mode ?? 'unique',
    minimum_quantity: input.minimum_quantity ?? null,
    expiry_date: input.expiry_date ?? null,
    purchase_date: input.purchase_date ?? null,
    warranty_date: input.warranty_date ?? null,
    status: input.status ?? 'in_stock',
    images: input.images ?? [],
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
    created_at: input.created_at ?? '2026-07-29T00:00:00.000Z',
    updated_at: input.updated_at ?? '2026-07-29T00:00:00.000Z',
  };
}

function createInventoryFixture(): Item[] {
  return [
    createItem({
      id: 'home',
      name: '家',
      type: 'container',
      metadata: { location_tag: true },
    }),
    createItem({
      id: 'bedroom',
      name: '卧室',
      parent_id: 'home',
      type: 'container',
      metadata: { location_tag: true },
    }),
    createItem({
      id: 'wardrobe',
      name: '衣柜',
      parent_id: 'bedroom',
      type: 'container',
      category: '家具',
    }),
    createItem({
      id: 'coat',
      name: '蓝色羽绒服',
      parent_id: 'wardrobe',
      category: '衣物',
      tags: ['冬季'],
      price: 800,
      quantity: 1,
    }),
    createItem({
      id: 'socks',
      name: '袜子',
      parent_id: 'wardrobe',
      category: '衣物',
      price: 20,
      quantity: 5,
    }),
    createItem({
      id: 'camera',
      name: '相机',
      category: '数码',
      price: 5000,
      quantity: 1,
      status: 'borrowed',
    }),
  ];
}

describe('asset map projection', () => {
  it('builds hierarchy paths and aggregate asset metrics', () => {
    const projection = buildAssetMapProjection(createInventoryFixture());
    const homeNode = projection.nodesById.get('home');
    const coatNode = projection.nodesById.get('coat');

    expect(projection.rootNodes.map((node) => node.id)).toEqual(['home', 'camera']);
    expect(coatNode?.path).toEqual(['家', '卧室', '衣柜']);
    expect(homeNode?.metrics).toEqual({
      directChildCount: 1,
      descendantNodeCount: 4,
      assetCount: 2,
      totalQuantity: 6,
      estimatedValue: 900,
    });
    expect(projection.totals).toEqual({
      locations: 2,
      containers: 1,
      items: 3,
      totalQuantity: 7,
      estimatedValue: 5900,
    });
  });

  it('keeps root-level assets and promotes items with missing parents to roots', () => {
    const projection = buildAssetMapProjection([
      createItem({ id: 'root-item', name: '未归位物品' }),
      createItem({ id: 'orphan', name: '异常父级物品', parent_id: 'missing-parent' }),
    ]);

    expect(new Set(projection.rootNodes.map((node) => node.id))).toEqual(new Set(['orphan', 'root-item']));
    expect(projection.nodesById.get('orphan')?.parentId).toBeNull();
  });

  it('returns an empty projection for an empty household', () => {
    const projection = buildAssetMapProjection([]);

    expect(projection.rootNodes).toEqual([]);
    expect(projection.nodesById.size).toBe(0);
    expect(projection.categories).toEqual([]);
  });

  it('projects a household with one thousand assets without losing nodes', () => {
    const largeInventory = Array.from({ length: LARGE_INVENTORY_SIZE }, (_, index) => createItem({
      id: `asset-${index}`,
      name: `资产 ${index}`,
      parent_id: index === 0
        ? null
        : `asset-${Math.floor((index - 1) / LARGE_INVENTORY_BRANCH_FACTOR)}`,
      type: index < LARGE_INVENTORY_CONTAINER_COUNT ? 'container' : 'item',
    }));

    const projection = buildAssetMapProjection(largeInventory);

    expect(projection.nodesById.size).toBe(LARGE_INVENTORY_SIZE);
    expect(projection.totals.items).toBe(LARGE_INVENTORY_SIZE - LARGE_INVENTORY_CONTAINER_COUNT);
    expect(projection.nodesById.get('asset-0')?.metrics.descendantNodeCount)
      .toBe(LARGE_INVENTORY_SIZE - 1);
  });
});

describe('asset map filtering', () => {
  it('keeps ancestors visible when a deep asset matches', () => {
    const projection = buildAssetMapProjection(createInventoryFixture());
    const filtered = filterAssetMapProjection({
      projection,
      filters: { ...DEFAULT_FILTERS, query: '羽绒服' },
      scopeId: null,
    });

    expect([...filtered.matchedNodeIds]).toEqual(['coat']);
    expect(filtered.visibleNodeIds).toEqual(new Set(['coat', 'wardrobe', 'bedroom', 'home']));
    expect(filtered.visibleChildren.map((node) => node.id)).toEqual(['home']);
  });

  it('combines type, status, category, and query filters', () => {
    const projection = buildAssetMapProjection(createInventoryFixture());
    const matches = findAssetMapMatches({
      projection,
      filters: {
        query: '相机',
        type: 'item',
        status: 'borrowed',
        category: '数码',
      },
    });

    expect(matches.map((node) => node.id)).toEqual(['camera']);
  });

  it('finds assets by tag and ancestor path', () => {
    const projection = buildAssetMapProjection(createInventoryFixture());

    expect(findAssetMapMatches({
      projection,
      filters: { ...DEFAULT_FILTERS, query: '冬季' },
    })[0]?.id).toBe('coat');
    expect(findAssetMapMatches({
      projection,
      filters: { ...DEFAULT_FILTERS, query: '卧室' },
    }).map((node) => node.id))
      .toEqual(['bedroom', 'wardrobe', 'coat', 'socks']);
  });
});
