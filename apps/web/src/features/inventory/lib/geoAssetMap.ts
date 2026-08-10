import type { Item } from '@inplace/domain';
import {
  buildAssetMapProjection,
  type AssetMapNode,
} from './assetMap';

export const ASSET_GEO_METADATA_KEY = 'geo_location';

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

interface MutableGeoAssetMapPoint extends Omit<GeoAssetMapPoint, 'metrics'> {
  metrics: GeoAssetMapMetrics;
}

const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;

interface CoordinateRange {
  minimum: number;
  maximum: number;
}

function isCoordinateInRange(value: number, range: CoordinateRange): boolean {
  return Number.isFinite(value) && value >= range.minimum && value <= range.maximum;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function readAssetGeoLocation(
  metadata: Record<string, unknown> | undefined,
): AssetGeoLocation | null {
  const rawLocation = metadata?.[ASSET_GEO_METADATA_KEY];
  if (!isUnknownRecord(rawLocation)) {
    return null;
  }

  const longitude = rawLocation.longitude;
  const latitude = rawLocation.latitude;
  if (
    typeof longitude !== 'number'
    || typeof latitude !== 'number'
    || !isCoordinateInRange(longitude, {
      minimum: MIN_LONGITUDE,
      maximum: MAX_LONGITUDE,
    })
    || !isCoordinateInRange(latitude, {
      minimum: MIN_LATITUDE,
      maximum: MAX_LATITUDE,
    })
  ) {
    return null;
  }

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

function findGeoSourceNode(
  node: AssetMapNode,
  nodesById: Map<string, AssetMapNode>,
): AssetMapNode | null {
  const visitedNodeIds = new Set<string>();
  let currentNode: AssetMapNode | undefined = node;

  while (currentNode && !visitedNodeIds.has(currentNode.id)) {
    visitedNodeIds.add(currentNode.id);
    if (
      readAssetGeoLocation(currentNode.item.metadata)
      && (currentNode.kind === 'location' || currentNode.id === node.id)
    ) {
      return currentNode;
    }
    currentNode = currentNode.parentId
      ? nodesById.get(currentNode.parentId)
      : undefined;
  }

  return null;
}

function createMutablePoint(sourceNode: AssetMapNode): MutableGeoAssetMapPoint | null {
  const coordinate = readAssetGeoLocation(sourceNode.item.metadata);
  if (!coordinate) {
    return null;
  }

  return {
    id: sourceNode.id,
    sourceNode,
    coordinate,
    assets: [],
    metrics: {
      assetCount: 0,
      totalQuantity: 0,
      estimatedValue: 0,
    },
    searchableText: [
      sourceNode.item.name,
      sourceNode.item.category,
      coordinate.address,
      ...sourceNode.path,
    ].join(' ').toLocaleLowerCase('zh-CN'),
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
    if (node.kind !== 'location') {
      continue;
    }

    const point = createMutablePoint(node);
    if (point) {
      mutablePointsById.set(point.id, point);
    } else {
      unmappedLocations.push(node);
    }
  }

  for (const node of hierarchy.nodesById.values()) {
    if (node.kind !== 'item') {
      continue;
    }

    const sourceNode = findGeoSourceNode(node, hierarchy.nodesById);
    if (!sourceNode) {
      unlocatedAssets.push(node);
      continue;
    }

    let point = mutablePointsById.get(sourceNode.id);
    if (!point) {
      const createdPoint = createMutablePoint(sourceNode);
      if (!createdPoint) {
        unlocatedAssets.push(node);
        continue;
      }
      point = createdPoint;
      mutablePointsById.set(point.id, point);
    }
    addAssetToPoint(point, node);
  }

  const points = [...mutablePointsById.values()]
    .map((point): GeoAssetMapPoint => point)
    .sort((left, right) => left.sourceNode.item.name.localeCompare(
      right.sourceNode.item.name,
      'zh-CN',
    ));
  const categories = [...new Set(
    points.flatMap((point) => point.assets.map((asset) => asset.item.category.trim()))
      .filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, 'zh-CN'));
  const totals = points.reduce<GeoAssetMapTotals>(
    (currentTotals, point) => ({
      ...currentTotals,
      assetCount: currentTotals.assetCount + point.metrics.assetCount,
      totalQuantity: currentTotals.totalQuantity + point.metrics.totalQuantity,
      estimatedValue: currentTotals.estimatedValue + point.metrics.estimatedValue,
    }),
    {
      mappedLocationCount: points.length,
      unmappedLocationCount: unmappedLocations.length,
      unlocatedAssetCount: unlocatedAssets.length,
      assetCount: 0,
      totalQuantity: 0,
      estimatedValue: 0,
    },
  );

  return {
    points,
    pointsById: new Map(points.map((point) => [point.id, point])),
    unmappedLocations,
    unlocatedAssets,
    categories,
    totals,
  };
}
