import { load } from '@amap/amap-jsapi-loader';
import type { AssetGeoLocation } from './geoAssetMap';
import type { AmapRuntimeConfig } from '../api/mapApi';

const AMAP_JS_API_VERSION = '2.0';
const AMAP_PLUGINS = ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geocoder'];
const GEO_ADDRESS_FALLBACK_PRECISION = 6;

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

interface AmapNamespaceWithGeocoder extends Record<string, unknown> {
  Map: typeof AMap.Map;
  Marker: typeof AMap.Marker;
  Pixel: typeof AMap.Pixel;
  Scale: new () => AMap.Control;
  ToolBar: new (options?: Record<string, unknown>) => AMap.Control;
  Geocoder: AmapGeocoderConstructor;
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

function formatCoordinateAddress(coordinate: AssetGeoLocation): string {
  return `${coordinate.longitude.toFixed(GEO_ADDRESS_FALLBACK_PRECISION)}, ${coordinate.latitude.toFixed(GEO_ADDRESS_FALLBACK_PRECISION)}`;
}

export async function reverseGeocode(
  namespace: AmapNamespaceWithGeocoder,
  coordinate: AssetGeoLocation,
): Promise<string> {
  const geocoder = new namespace.Geocoder({
    radius: 300,
    extensions: 'base',
  });

  return new Promise((resolve) => {
    geocoder.getAddress(
      [coordinate.longitude, coordinate.latitude],
      (status, result) => {
        const formattedAddress = status === 'complete'
          ? readFormattedAddress(result)
          : null;
        resolve(formattedAddress ?? formatCoordinateAddress(coordinate));
      },
    );
  });
}

export type AmapSdkNamespace = AmapNamespaceWithGeocoder;
