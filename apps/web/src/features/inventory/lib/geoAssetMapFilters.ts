import type { ItemStatus } from '@inplace/domain';
import type { AssetMapNode } from './assetMap';
import type {
  GeoAssetMapMetrics,
  GeoAssetMapPoint,
  GeoAssetMapProjection,
} from './geoAssetMap';

export const GEO_ASSET_ALL_FILTER = 'all';

export interface GeoAssetMapFilters {
  query: string;
  status: typeof GEO_ASSET_ALL_FILTER | ItemStatus;
  category: string;
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
    || filters.category !== GEO_ASSET_ALL_FILTER;

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
