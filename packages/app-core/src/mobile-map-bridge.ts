import type { AssetGeoLocation, GeoAssetMapPoint } from './geo-asset-map';

export interface MobileMapPoint {
  id: string;
  name: string;
  category: string;
  presetKey: string | null;
  icon: string;
  color: string;
  longitude: number;
  latitude: number;
  assetCount: number;
}

export type NativeToMobileMapMessage =
  | { type: 'initialize'; points: MobileMapPoint[]; selectedPointIds: string[] }
  | { type: 'update-points'; points: MobileMapPoint[] }
  | { type: 'select-points'; pointIds: string[] }
  | { type: 'set-coordinate-mode'; targetId: string | null; targetName: string | null };

export type MobileMapToNativeMessage =
  | { type: 'ready' }
  | { type: 'select-points'; pointIds: string[] }
  | { type: 'choose-coordinate'; coordinate: AssetGeoLocation }
  | { type: 'error'; code: string; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const allowedKeys = new Set(keys);
  return Object.keys(value).every((key) => allowedKeys.has(key))
    && keys.every((key) => key in value);
}

function isMobileMapPoint(value: unknown): value is MobileMapPoint {
  if (!isRecord(value)) return false;
  return hasExactKeys(value, ['id', 'name', 'category', 'presetKey', 'icon', 'color', 'longitude', 'latitude', 'assetCount'])
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.category === 'string'
    && (value.presetKey === null || typeof value.presetKey === 'string')
    && typeof value.icon === 'string'
    && typeof value.color === 'string'
    && typeof value.longitude === 'number'
    && Number.isFinite(value.longitude)
    && typeof value.latitude === 'number'
    && Number.isFinite(value.latitude)
    && typeof value.assetCount === 'number'
    && Number.isFinite(value.assetCount);
}

export function parseNativeToMobileMapMessage(value: unknown): NativeToMobileMapMessage | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;
  if ((value.type === 'initialize' || value.type === 'update-points')
    && Array.isArray(value.points) && value.points.every(isMobileMapPoint)) {
    if (value.type === 'initialize'
      && hasExactKeys(value, ['type', 'points', 'selectedPointIds'])
      && isStringArray(value.selectedPointIds)) {
      return { type: 'initialize', points: value.points, selectedPointIds: value.selectedPointIds };
    }
    if (value.type === 'update-points' && hasExactKeys(value, ['type', 'points'])) {
      return { type: 'update-points', points: value.points };
    }
  }
  if (value.type === 'select-points'
    && hasExactKeys(value, ['type', 'pointIds'])
    && isStringArray(value.pointIds)) {
    return { type: 'select-points', pointIds: value.pointIds };
  }
  if (value.type === 'set-coordinate-mode' && hasExactKeys(value, ['type', 'targetId', 'targetName'])) {
    if ((value.targetId === null || typeof value.targetId === 'string')
      && (value.targetName === null || typeof value.targetName === 'string')) {
      return { type: 'set-coordinate-mode', targetId: value.targetId, targetName: value.targetName };
    }
  }
  return null;
}

export function parseMobileMapToNativeMessage(value: unknown): MobileMapToNativeMessage | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;
  if (value.type === 'ready' && hasExactKeys(value, ['type'])) return { type: 'ready' };
  if (value.type === 'select-points'
    && hasExactKeys(value, ['type', 'pointIds'])
    && isStringArray(value.pointIds)) {
    return { type: 'select-points', pointIds: value.pointIds };
  }
  if (value.type === 'error'
    && hasExactKeys(value, ['type', 'code', 'message'])
    && typeof value.code === 'string' && typeof value.message === 'string') {
    return { type: 'error', code: value.code, message: value.message };
  }
  if (value.type === 'choose-coordinate'
    && hasExactKeys(value, ['type', 'coordinate'])
    && isRecord(value.coordinate)
    && hasExactKeys(value.coordinate, ['longitude', 'latitude', 'address'])) {
    const { longitude, latitude, address } = value.coordinate;
    if (typeof longitude === 'number' && Number.isFinite(longitude)
      && typeof latitude === 'number' && Number.isFinite(latitude)
      && typeof address === 'string') {
      return { type: 'choose-coordinate', coordinate: { longitude, latitude, address } };
    }
  }
  return null;
}

export function serializeNativeToMobileMapMessage(message: NativeToMobileMapMessage): string {
  return JSON.stringify(message)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function toMobileMapPoints(
  points: GeoAssetMapPoint[],
  categoryPresentation: Map<string, { presetKey?: string | null; icon: string; color: string }>,
): MobileMapPoint[] {
  return points.map((point) => {
    const category = point.sourceNode.item.category;
    const presentation = categoryPresentation.get(category);
    return {
      id: point.id,
      name: point.sourceNode.item.name,
      category,
      presetKey: presentation?.presetKey ?? null,
      icon: presentation?.icon ?? 'location-outline',
      color: presentation?.color ?? 'teal',
      longitude: point.coordinate.longitude,
      latitude: point.coordinate.latitude,
      assetCount: point.metrics.assetCount,
    };
  });
}
