import type { ItemStatus } from '@inplace/domain';
import type { AssetMapNode } from './assetMap';
import type {
  GeoAssetMapMetrics,
  GeoAssetMapPoint,
  GeoAssetMapProjection,
} from './geoAssetMap';

export const GEO_ASSET_ALL_FILTER = 'all';

export const DEFAULT_GEO_ASSET_MAP_FILTERS: GeoAssetMapFilters = {
  query: '',
  status: GEO_ASSET_ALL_FILTER,
  category: GEO_ASSET_ALL_FILTER,
  createdAfter: '',
  createdBefore: '',
};

const MAP_FILTER_PARAM_KEYS = {
  query: 'mapQuery',
  status: 'mapStatus',
  category: 'mapCategory',
  createdAfter: 'mapFrom',
  createdBefore: 'mapTo',
} as const;

const VALID_ITEM_STATUSES = new Set<ItemStatus>([
  'in_stock',
  'borrowed',
  'worn_out',
]);

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface GeoAssetMapFilters {
  query: string;
  status: typeof GEO_ASSET_ALL_FILTER | ItemStatus;
  category: string;
  createdAfter: string;
  createdBefore: string;
}

function readDateParam(value: string | null): string {
  return value && ISO_DATE_PATTERN.test(value) ? value : '';
}

function readStatusParam(value: string | null): GeoAssetMapFilters['status'] {
  if (value && VALID_ITEM_STATUSES.has(value as ItemStatus)) {
    return value as ItemStatus;
  }
  return GEO_ASSET_ALL_FILTER;
}

export function parseGeoAssetMapFilters(searchParams: URLSearchParams): GeoAssetMapFilters {
  return {
    query: searchParams.get(MAP_FILTER_PARAM_KEYS.query) ?? '',
    status: readStatusParam(searchParams.get(MAP_FILTER_PARAM_KEYS.status)),
    category: searchParams.get(MAP_FILTER_PARAM_KEYS.category) || GEO_ASSET_ALL_FILTER,
    createdAfter: readDateParam(searchParams.get(MAP_FILTER_PARAM_KEYS.createdAfter)),
    createdBefore: readDateParam(searchParams.get(MAP_FILTER_PARAM_KEYS.createdBefore)),
  };
}

export function serializeGeoAssetMapFilters(
  currentSearchParams: URLSearchParams,
  filters: GeoAssetMapFilters,
): URLSearchParams {
  const nextSearchParams = new URLSearchParams(currentSearchParams);
  const values: Array<[string, string, string]> = [
    [MAP_FILTER_PARAM_KEYS.query, filters.query.trim(), ''],
    [MAP_FILTER_PARAM_KEYS.status, filters.status, GEO_ASSET_ALL_FILTER],
    [MAP_FILTER_PARAM_KEYS.category, filters.category, GEO_ASSET_ALL_FILTER],
    [MAP_FILTER_PARAM_KEYS.createdAfter, filters.createdAfter, ''],
    [MAP_FILTER_PARAM_KEYS.createdBefore, filters.createdBefore, ''],
  ];

  values.forEach(([key, value, defaultValue]) => {
    if (!value || value === defaultValue) {
      nextSearchParams.delete(key);
      return;
    }
    nextSearchParams.set(key, value);
  });

  return nextSearchParams;
}

interface AssetFilterInput {
  assetNode: AssetMapNode;
  normalizedQuery: string;
  filters: GeoAssetMapFilters;
}

function doesAssetMatchFilters({
  assetNode,
  normalizedQuery,
  filters,
}: AssetFilterInput): boolean {
  if (
    filters.status !== GEO_ASSET_ALL_FILTER
    && assetNode.item.status !== filters.status
  ) {
    return false;
  }
  if (
    filters.category !== GEO_ASSET_ALL_FILTER
    && assetNode.item.category !== filters.category
  ) {
    return false;
  }
  const createdDate = assetNode.item.created_at.slice(0, 10);
  if (filters.createdAfter && createdDate < filters.createdAfter) {
    return false;
  }
  if (filters.createdBefore && createdDate > filters.createdBefore) {
    return false;
  }
  return !normalizedQuery || assetNode.searchableText.includes(normalizedQuery);
}

function calculateMetrics(assets: AssetMapNode[]): GeoAssetMapMetrics {
  return assets.reduce<GeoAssetMapMetrics>(
    (metrics, assetNode) => {
      const quantity = Math.max(assetNode.item.quantity, 0);
      return {
        assetCount: metrics.assetCount + 1,
        totalQuantity: metrics.totalQuantity + quantity,
        estimatedValue: metrics.estimatedValue + (assetNode.item.price ?? 0) * quantity,
      };
    },
    {
      assetCount: 0,
      totalQuantity: 0,
      estimatedValue: 0,
    },
  );
}

export function filterGeoAssetMapPoints(
  projection: GeoAssetMapProjection,
  filters: GeoAssetMapFilters,
): GeoAssetMapPoint[] {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase('zh-CN');
  const hasAssetFilters = filters.status !== GEO_ASSET_ALL_FILTER
    || filters.category !== GEO_ASSET_ALL_FILTER
    || Boolean(filters.createdAfter)
    || Boolean(filters.createdBefore);

  return projection.points.flatMap((point) => {
    const doesLocationMatch = Boolean(
      normalizedQuery && point.searchableText.includes(normalizedQuery),
    );
    const filteredAssets = doesLocationMatch && !hasAssetFilters
      ? point.assets
      : point.assets.filter((assetNode) => doesAssetMatchFilters({
        assetNode,
        normalizedQuery,
        filters,
      }));
    const shouldKeepEmptyLocation = point.assets.length === 0
      && !hasAssetFilters
      && (!normalizedQuery || doesLocationMatch);
    if (filteredAssets.length === 0 && !shouldKeepEmptyLocation) {
      return [];
    }

    return [{
      ...point,
      assets: filteredAssets,
      metrics: calculateMetrics(filteredAssets),
    }];
  });
}
