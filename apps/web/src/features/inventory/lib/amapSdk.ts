import { load } from '@amap/amap-jsapi-loader';
import type { AssetGeoLocation } from './geoAssetMap';
import type { AmapRuntimeConfig } from '../api/mapApi';

const AMAP_JS_API_VERSION = '2.0';
const AMAP_PLUGINS = [
  'AMap.Scale',
  'AMap.ToolBar',
  'AMap.Geocoder',
  'AMap.Geolocation',
  'AMap.MarkerCluster',
];

interface GeocoderResult {
  regeocode?: {
    formattedAddress?: unknown;
  };
}

interface AmapGeocoder {
  getAddress: (
    coordinate: [number, number],
    callback: (status: string, result: unknown) => void,
  ) => void;
}

interface AmapGeocoderConstructor {
  new (options?: { radius?: number; extensions?: string }): AmapGeocoder;
}

interface AmapGeolocationConstructor {
  new (options?: Record<string, unknown>): AMap.Control;
}

export interface AmapClusterDatum {
  lnglat: [number, number];
  pointId: string;
  assetCount: number;
}

export interface AmapClusterRenderContext {
  count?: number;
  clusterData?: AmapClusterDatum[];
  data?: AmapClusterDatum[];
  marker: AMap.Marker;
}

export function readAmapClusterData(
  context: Pick<AmapClusterRenderContext, 'clusterData' | 'data'>,
): AmapClusterDatum[] {
  if (Array.isArray(context.clusterData)) {
    return context.clusterData;
  }
  if (Array.isArray(context.data)) {
    return context.data;
  }
  return [];
}

function readMarkerCoordinate(marker: AMap.Marker): [number, number] | null {
  const position = marker.getPosition();
  if (!position) {
    return null;
  }
  const longitude = position.getLng();
  const latitude = position.getLat();
  return Number.isFinite(longitude) && Number.isFinite(latitude)
    ? [longitude, latitude]
    : null;
}

export function resolveAmapClusterData(
  context: AmapClusterRenderContext,
  allData: AmapClusterDatum[],
): AmapClusterDatum[] {
  const expectedCount = Math.max(1, Math.round(context.count ?? 1));
  const callbackData = readAmapClusterData(context);
  if (callbackData.length === expectedCount) {
    return callbackData;
  }

  const markerCoordinate = readMarkerCoordinate(context.marker);
  if (!markerCoordinate) {
    return callbackData.length > 0
      ? callbackData.slice(0, expectedCount)
      : allData.slice(0, expectedCount);
  }

  const [markerLongitude, markerLatitude] = markerCoordinate;
  return allData
    .map((datum) => ({
      datum,
      distance: (datum.lnglat[0] - markerLongitude) ** 2
        + (datum.lnglat[1] - markerLatitude) ** 2,
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, expectedCount)
    .map(({ datum }) => datum);
}

export interface AmapMarkerClusterInstance {
  setData: (data: AmapClusterDatum[]) => void;
  setMap: (map: AMap.Map | null) => void;
}

interface AmapMarkerClusterConstructor {
  new (
    map: AMap.Map,
    data: AmapClusterDatum[],
    options?: {
      gridSize?: number;
      maxZoom?: number;
      zoomOnClick?: boolean;
      averageCenter?: boolean;
      renderClusterMarker?: (context: AmapClusterRenderContext) => void;
      renderMarker?: (context: AmapClusterRenderContext) => void;
    },
  ): AmapMarkerClusterInstance;
}

interface AmapNamespaceWithGeocoder extends Record<string, unknown> {
  Map: typeof AMap.Map;
  Marker: typeof AMap.Marker;
  Pixel: typeof AMap.Pixel;
  Scale: new () => AMap.Control;
  ToolBar: new (options?: Record<string, unknown>) => AMap.Control;
  Geocoder: AmapGeocoderConstructor;
  Geolocation: AmapGeolocationConstructor;
  MarkerCluster: AmapMarkerClusterConstructor;
  Bounds: typeof AMap.Bounds;
}

let amapLoadPromise: Promise<AmapNamespaceWithGeocoder> | null = null;

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isAmapNamespace(value: unknown): value is AmapNamespaceWithGeocoder {
  if (!isUnknownRecord(value)) {
    return false;
  }

  return [
    'Map',
    'Marker',
    'Pixel',
    'Scale',
    'ToolBar',
    'Geocoder',
    'Geolocation',
    'MarkerCluster',
    'Bounds',
  ].every((constructorName) => typeof value[constructorName] === 'function');
}

export async function loadAmapSdk(
  config: AmapRuntimeConfig,
): Promise<AmapNamespaceWithGeocoder> {
  if (!amapLoadPromise) {
    window._AMapSecurityConfig = {
      serviceHost: config.serviceHost,
    };
    amapLoadPromise = Promise.resolve(load({
      key: config.key,
      version: AMAP_JS_API_VERSION,
      plugins: AMAP_PLUGINS,
    })).then((namespace: unknown) => {
      if (!isAmapNamespace(namespace)) {
        throw new Error('高德地图 SDK 加载结果无效');
      }
      return namespace;
    });
  }

  return amapLoadPromise;
}

function readFormattedAddress(result: unknown): string | null {
  if (!isUnknownRecord(result)) {
    return null;
  }

  const geocoderResult: GeocoderResult = result;
  const formattedAddress = geocoderResult.regeocode?.formattedAddress;
  return typeof formattedAddress === 'string' && formattedAddress.trim()
    ? formattedAddress.trim()
    : null;
}

export async function reverseGeocode(
  namespace: AmapNamespaceWithGeocoder,
  coordinate: AssetGeoLocation,
): Promise<string> {
  const geocoder = new namespace.Geocoder({
    radius: 300,
    extensions: 'base',
  });

  return new Promise((resolve, reject) => {
    geocoder.getAddress(
      [coordinate.longitude, coordinate.latitude],
      (status, result) => {
        const formattedAddress = status === 'complete'
          ? readFormattedAddress(result)
          : null;
        if (!formattedAddress) {
          reject(new Error('AMAP_REVERSE_GEOCODE_FAILED'));
          return;
        }
        resolve(formattedAddress);
      },
    );
  });
}

export type AmapSdkNamespace = AmapNamespaceWithGeocoder;
