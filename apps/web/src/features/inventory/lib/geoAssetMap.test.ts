import type { Item } from '@inplace/domain';
import { describe, expect, it } from 'vitest';
import {
  ASSET_GEO_METADATA_KEY,
  buildGeoAssetMapProjection,
  readAssetGeoLocation,
  updateAssetGeoLocationMetadata,
} from './geoAssetMap';
import {
  DEFAULT_GEO_ASSET_MAP_FILTERS,
  filterGeoAssetMapPoints,
  GEO_ASSET_ALL_FILTER,
  parseGeoAssetMapFilters,
  serializeGeoAssetMapFilters,
} from './geoAssetMapFilters';

function createItem(input: Partial<Item> & Pick<Item, 'id' | 'name'>): Item {
  return {
    id: input.id,
    user_id: 'user-1',
    household_id: 'household-1',
    parent_id: input.parent_id ?? null,
    type: input.type ?? 'item',
    name: input.name,
    description: '',
    category: input.category ?? '',
    price: input.price ?? null,
    quantity: input.quantity ?? 1,
    tracking_mode: 'unique',
    minimum_quantity: null,
    expiry_date: null,
    purchase_date: null,
    warranty_date: null,
    status: input.status ?? 'in_stock',
    images: [],
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
    created_at: '2026-07-29T00:00:00.000Z',
    updated_at: '2026-07-29T00:00:00.000Z',
  };
}

const HOME_GEO = {
  longitude: 116.397,
  latitude: 39.909,
  address: '北京市东城区',
};
const EXPECTED_CAMERA_VALUE = 10_000;

describe('geographic asset map projection', () => {
  it('maps nested assets to the nearest geocoded location', () => {
    const projection = buildGeoAssetMapProjection([
      createItem({
        id: 'home',
        name: '我的家',
        type: 'container',
        metadata: { location_tag: true, [ASSET_GEO_METADATA_KEY]: HOME_GEO },
      }),
      createItem({
        id: 'living-room',
        name: '客厅',
        parent_id: 'home',
        type: 'container',
        metadata: { location_tag: true },
      }),
      createItem({
        id: 'camera',
        name: '相机',
        parent_id: 'living-room',
        price: 5000,
        quantity: 2,
      }),
    ]);

    expect(projection.points).toHaveLength(1);
    expect(projection.points[0]?.sourceNode.id).toBe('home');
    expect(projection.points[0]?.assets.map((node) => node.id)).toEqual(['camera']);
    expect(projection.points[0]?.metrics.estimatedValue).toBe(EXPECTED_CAMERA_VALUE);
    expect(projection.unlocatedAssets).toEqual([]);
  });

  it('uses a child location coordinate instead of its mapped ancestor', () => {
    const projection = buildGeoAssetMapProjection([
      createItem({
        id: 'home',
        name: '我的家',
        type: 'container',
        metadata: { location_tag: true, [ASSET_GEO_METADATA_KEY]: HOME_GEO },
      }),
      createItem({
        id: 'warehouse',
        name: '异地仓库',
        parent_id: 'home',
        type: 'container',
        metadata: {
          location_tag: true,
          [ASSET_GEO_METADATA_KEY]: {
            longitude: 121.473,
            latitude: 31.23,
            address: '上海市黄浦区',
          },
        },
      }),
      createItem({ id: 'toolbox', name: '工具箱', parent_id: 'warehouse' }),
    ]);

    expect(projection.pointsById.get('warehouse')?.assets[0]?.id).toBe('toolbox');
    expect(projection.pointsById.get('home')?.assets).toEqual([]);
  });

  it('keeps nested locations without coordinates available for first-time mapping', () => {
    const projection = buildGeoAssetMapProjection([
      createItem({
        id: 'home',
        name: '我的家',
        type: 'container',
        metadata: { location_tag: true, [ASSET_GEO_METADATA_KEY]: HOME_GEO },
      }),
      createItem({
        id: 'warehouse',
        name: '异地仓库',
        parent_id: 'home',
        type: 'container',
        metadata: { location_tag: true },
      }),
    ]);

    expect(projection.unmappedLocations.map((node) => node.id)).toContain('warehouse');
  });

  it('tracks unlocated root locations and assets', () => {
    const projection = buildGeoAssetMapProjection([
      createItem({
        id: 'home',
        name: '我的家',
        type: 'container',
        metadata: { location_tag: true },
      }),
      createItem({ id: 'camera', name: '相机', parent_id: 'home' }),
      createItem({ id: 'loose-item', name: '未归位物品' }),
    ]);

    expect(projection.unmappedLocations.map((node) => node.id)).toEqual(['home']);
    expect(projection.unlocatedAssets.map((node) => node.id)).toEqual([
      'camera',
      'loose-item',
    ]);
  });

  it('filters mapped assets by query, status, and category', () => {
    const projection = buildGeoAssetMapProjection([
      createItem({
        id: 'home',
        name: '我的家',
        type: 'container',
        metadata: { location_tag: true, [ASSET_GEO_METADATA_KEY]: HOME_GEO },
      }),
      createItem({
        id: 'camera',
        name: '相机',
        parent_id: 'home',
        category: '数码',
        status: 'borrowed',
      }),
      createItem({ id: 'coat', name: '羽绒服', parent_id: 'home', category: '衣物' }),
    ]);

    const points = filterGeoAssetMapPoints(projection, {
      query: '相机',
      status: 'borrowed',
      category: '数码',
      createdAfter: '',
      createdBefore: '',
    });

    expect(points[0]?.assets.map((node) => node.id)).toEqual(['camera']);
    expect(filterGeoAssetMapPoints(projection, {
      query: '',
      status: GEO_ASSET_ALL_FILTER,
      category: '衣物',
      createdAfter: '',
      createdBefore: '',
    })[0]?.assets.map((node) => node.id)).toEqual(['coat']);
  });

  it('only exposes categories belonging to mapped assets', () => {
    const projection = buildGeoAssetMapProjection([
      createItem({
        id: 'home',
        name: '我的家',
        type: 'container',
        category: '公寓',
        metadata: { location_tag: true, [ASSET_GEO_METADATA_KEY]: HOME_GEO },
      }),
      createItem({
        id: 'storage-box',
        name: '收纳箱',
        type: 'container',
        category: '收纳',
        parent_id: 'home',
      }),
      createItem({
        id: 'camera',
        name: '相机',
        parent_id: 'storage-box',
        category: '数码',
      }),
      createItem({
        id: 'unlocated-tent',
        name: '帐篷',
        category: '户外',
      }),
    ]);

    expect(projection.categories).toEqual(['数码']);
  });

  it('filters mapped assets by creation date range', () => {
    const projection = buildGeoAssetMapProjection([
      createItem({ id: 'home', name: '我的家', type: 'container', metadata: { location_tag: true, [ASSET_GEO_METADATA_KEY]: HOME_GEO } }),
      { ...createItem({ id: 'old-camera', name: '旧相机', parent_id: 'home' }), created_at: '2024-01-01T00:00:00.000Z' },
      { ...createItem({ id: 'new-camera', name: '新相机', parent_id: 'home' }), created_at: '2026-01-01T00:00:00.000Z' },
    ]);

    const points = filterGeoAssetMapPoints(projection, {
      query: '',
      status: GEO_ASSET_ALL_FILTER,
      category: GEO_ASSET_ALL_FILTER,
      createdAfter: '2025-01-01',
      createdBefore: '2026-12-31',
    });

    expect(points[0]?.assets.map((node) => node.id)).toEqual(['new-camera']);
  });
});

describe('asset coordinate metadata', () => {
  it('preserves unrelated metadata when saving a coordinate', () => {
    const metadata = updateAssetGeoLocationMetadata(
      { location_tag: true },
      HOME_GEO,
    );

    expect(metadata.location_tag).toBe(true);
    expect(readAssetGeoLocation(metadata)).toEqual(HOME_GEO);
  });

  it('rejects coordinates outside valid longitude and latitude ranges', () => {
    expect(readAssetGeoLocation({
      [ASSET_GEO_METADATA_KEY]: {
        longitude: 181,
        latitude: 39,
        address: 'invalid',
      },
    })).toBeNull();
  });
});

describe('geographic asset map URL filters', () => {
  it('round trips non-default filters without removing the selected view', () => {
    const searchParams = serializeGeoAssetMapFilters(
      new URLSearchParams('view=map'),
      {
        query: '相机',
        status: 'borrowed',
        category: '数码电子',
        createdAfter: '2026-01-01',
        createdBefore: '2026-12-31',
      },
    );

    expect(searchParams.get('view')).toBe('map');
    expect(parseGeoAssetMapFilters(searchParams)).toEqual({
      query: '相机',
      status: 'borrowed',
      category: '数码电子',
      createdAfter: '2026-01-01',
      createdBefore: '2026-12-31',
    });
  });

  it('removes default filters and ignores invalid URL values', () => {
    const searchParams = serializeGeoAssetMapFilters(
      new URLSearchParams('view=map&mapQuery=旧值&mapStatus=borrowed'),
      DEFAULT_GEO_ASSET_MAP_FILTERS,
    );

    expect(searchParams.toString()).toBe('view=map');
    expect(parseGeoAssetMapFilters(new URLSearchParams(
      'mapStatus=invalid&mapFrom=2026-1-1&mapTo=not-a-date',
    ))).toEqual(DEFAULT_GEO_ASSET_MAP_FILTERS);
  });
});
