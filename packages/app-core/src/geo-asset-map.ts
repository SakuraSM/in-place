import type { Item, ItemStatus } from '@inplace/domain';
import { buildAssetMapProjection, type AssetMapNode } from './asset-map';

export const ASSET_GEO_METADATA_KEY = 'geo_location';
export const GEO_ASSET_ALL_FILTER = 'all';

export interface AssetGeoLocation {
  longitude: number;
  latitude: number;
  address: string;
}

export interface GeoAssetMapMetrics {
  assetCount: number;
  totalQuantity: number;
  estimatedValue: number;
}

export interface GeoAssetMapPoint {
  id: string;
  sourceNode: AssetMapNode;
  coordinate: AssetGeoLocation;
  assets: AssetMapNode[];
  metrics: GeoAssetMapMetrics;
  searchableText: string;
}

export interface GeoAssetMapTotals extends GeoAssetMapMetrics {
  mappedLocationCount: number;
  unmappedLocationCount: number;
  unlocatedAssetCount: number;
}

export interface GeoAssetMapProjection {
  points: GeoAssetMapPoint[];
  pointsById: Map<string, GeoAssetMapPoint>;
  unmappedLocations: AssetMapNode[];
  unlocatedAssets: AssetMapNode[];
  categories: string[];
  totals: GeoAssetMapTotals;
}

export interface GeoAssetMapFilters {
  query: string;
  status: typeof GEO_ASSET_ALL_FILTER | ItemStatus;
  category: string;
  createdAfter: string;
  createdBefore: string;
}

interface MutableGeoAssetMapPoint extends Omit<GeoAssetMapPoint, 'metrics'> {
  metrics: GeoAssetMapMetrics;
}

const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_ITEM_STATUSES = new Set<ItemStatus>(['in_stock', 'borrowed', 'worn_out']);

const MAP_FILTER_PARAM_KEYS = {
  query: 'mapQuery',
  status: 'mapStatus',
  category: 'mapCategory',
  createdAfter: 'mapFrom',
  createdBefore: 'mapTo',
} as const;

export const DEFAULT_GEO_ASSET_MAP_FILTERS: GeoAssetMapFilters = {
  query: '',
  status: GEO_ASSET_ALL_FILTER,
  category: GEO_ASSET_ALL_FILTER,
  createdAfter: '',
  createdBefore: '',
};

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function readAssetGeoLocation(metadata: Record<string, unknown> | undefined): AssetGeoLocation | null {
  const rawLocation = metadata?.[ASSET_GEO_METADATA_KEY];
  if (!isUnknownRecord(rawLocation)) return null;
  const longitude = rawLocation.longitude;
  const latitude = rawLocation.latitude;
  if (typeof longitude !== 'number' || typeof latitude !== 'number'
    || !Number.isFinite(longitude) || longitude < MIN_LONGITUDE || longitude > MAX_LONGITUDE
    || !Number.isFinite(latitude) || latitude < MIN_LATITUDE || latitude > MAX_LATITUDE) return null;
  return {
    longitude,
    latitude,
    address: typeof rawLocation.address === 'string' ? rawLocation.address.trim() : '',
  };
}

export function updateAssetGeoLocationMetadata(
  metadata: Record<string, unknown> | undefined,
  location: AssetGeoLocation,
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    [ASSET_GEO_METADATA_KEY]: {
      longitude: location.longitude,
      latitude: location.latitude,
      address: location.address.trim(),
    },
  };
}

function findGeoSourceNode(node: AssetMapNode, nodesById: Map<string, AssetMapNode>): AssetMapNode | null {
  const visitedNodeIds = new Set<string>();
  let currentNode: AssetMapNode | undefined = node;
  while (currentNode && !visitedNodeIds.has(currentNode.id)) {
    visitedNodeIds.add(currentNode.id);
    if (readAssetGeoLocation(currentNode.item.metadata)
      && (currentNode.kind === 'location' || currentNode.id === node.id)) return currentNode;
    currentNode = currentNode.parentId ? nodesById.get(currentNode.parentId) : undefined;
  }
  return null;
}

function createMutablePoint(sourceNode: AssetMapNode): MutableGeoAssetMapPoint | null {
  const coordinate = readAssetGeoLocation(sourceNode.item.metadata);
  if (!coordinate) return null;
  return {
    id: sourceNode.id,
    sourceNode,
    coordinate,
    assets: [],
    metrics: { assetCount: 0, totalQuantity: 0, estimatedValue: 0 },
    searchableText: [sourceNode.item.name, sourceNode.item.category, coordinate.address, ...sourceNode.path]
      .join(' ')
      .toLocaleLowerCase('zh-CN'),
  };
}

function addAssetToPoint(point: MutableGeoAssetMapPoint, assetNode: AssetMapNode): void {
  const quantity = Math.max(assetNode.item.quantity, 0);
  point.assets.push(assetNode);
  point.metrics.assetCount += 1;
  point.metrics.totalQuantity += quantity;
  point.metrics.estimatedValue += (assetNode.item.price ?? 0) * quantity;
}

export function buildGeoAssetMapProjection(items: Item[]): GeoAssetMapProjection {
  const hierarchy = buildAssetMapProjection(items);
  const mutablePointsById = new Map<string, MutableGeoAssetMapPoint>();
  const unlocatedAssets: AssetMapNode[] = [];
  const unmappedLocations: AssetMapNode[] = [];

  for (const node of hierarchy.nodesById.values()) {
    if (node.kind !== 'location') continue;
    const point = createMutablePoint(node);
    if (point) mutablePointsById.set(point.id, point);
    else unmappedLocations.push(node);
  }

  for (const node of hierarchy.nodesById.values()) {
    if (node.kind !== 'item') continue;
    const sourceNode = findGeoSourceNode(node, hierarchy.nodesById);
    if (!sourceNode) {
      unlocatedAssets.push(node);
      continue;
    }
    let point = mutablePointsById.get(sourceNode.id);
    if (!point) {
      point = createMutablePoint(sourceNode) ?? undefined;
      if (!point) {
        unlocatedAssets.push(node);
        continue;
      }
      mutablePointsById.set(point.id, point);
    }
    addAssetToPoint(point, node);
  }

  const points = [...mutablePointsById.values()]
    .map((point): GeoAssetMapPoint => point)
    .sort((left, right) => left.sourceNode.item.name.localeCompare(right.sourceNode.item.name, 'zh-CN'));
  const categories = [...new Set(points.flatMap((point) => point.assets.map((asset) => asset.item.category.trim())).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, 'zh-CN'));
  const totals = points.reduce<GeoAssetMapTotals>((currentTotals, point) => ({
    ...currentTotals,
    assetCount: currentTotals.assetCount + point.metrics.assetCount,
    totalQuantity: currentTotals.totalQuantity + point.metrics.totalQuantity,
    estimatedValue: currentTotals.estimatedValue + point.metrics.estimatedValue,
  }), {
    mappedLocationCount: points.length,
    unmappedLocationCount: unmappedLocations.length,
    unlocatedAssetCount: unlocatedAssets.length,
    assetCount: 0,
    totalQuantity: 0,
    estimatedValue: 0,
  });

  return {
    points,
    pointsById: new Map(points.map((point) => [point.id, point])),
    unmappedLocations,
    unlocatedAssets,
    categories,
    totals,
  };
}

function readDateParam(value: string | null): string {
  return value && ISO_DATE_PATTERN.test(value) ? value : '';
}

function readStatusParam(value: string | null): GeoAssetMapFilters['status'] {
  return value && VALID_ITEM_STATUSES.has(value as ItemStatus) ? value as ItemStatus : GEO_ASSET_ALL_FILTER;
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
    if (!value || value === defaultValue) nextSearchParams.delete(key);
    else nextSearchParams.set(key, value);
  });
  return nextSearchParams;
}

function doesAssetMatchFilters(
  assetNode: AssetMapNode,
  normalizedQuery: string,
  filters: GeoAssetMapFilters,
): boolean {
  if (filters.status !== GEO_ASSET_ALL_FILTER && assetNode.item.status !== filters.status) return false;
  if (filters.category !== GEO_ASSET_ALL_FILTER && assetNode.item.category !== filters.category) return false;
  const createdDate = assetNode.item.created_at.slice(0, 10);
  if (filters.createdAfter && createdDate < filters.createdAfter) return false;
  if (filters.createdBefore && createdDate > filters.createdBefore) return false;
  return !normalizedQuery || assetNode.searchableText.includes(normalizedQuery);
}

function calculateMetrics(assets: AssetMapNode[]): GeoAssetMapMetrics {
  return assets.reduce<GeoAssetMapMetrics>((metrics, assetNode) => {
    const quantity = Math.max(assetNode.item.quantity, 0);
    return {
      assetCount: metrics.assetCount + 1,
      totalQuantity: metrics.totalQuantity + quantity,
      estimatedValue: metrics.estimatedValue + (assetNode.item.price ?? 0) * quantity,
    };
  }, { assetCount: 0, totalQuantity: 0, estimatedValue: 0 });
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
    const doesLocationMatch = Boolean(normalizedQuery && point.searchableText.includes(normalizedQuery));
    const filteredAssets = doesLocationMatch && !hasAssetFilters
      ? point.assets
      : point.assets.filter((assetNode) => doesAssetMatchFilters(assetNode, normalizedQuery, filters));
    const shouldKeepEmptyLocation = point.assets.length === 0
      && !hasAssetFilters
      && (!normalizedQuery || doesLocationMatch);
    if (filteredAssets.length === 0 && !shouldKeepEmptyLocation) return [];
    return [{ ...point, assets: filteredAssets, metrics: calculateMetrics(filteredAssets) }];
  });
}
