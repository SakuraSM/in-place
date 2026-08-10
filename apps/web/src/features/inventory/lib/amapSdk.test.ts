import { describe, expect, it } from 'vitest';
import type { AmapClusterDatum, AmapClusterRenderContext } from './amapSdk';
import {
  readAmapClusterData,
  resolveAmapClusterData,
  reverseGeocode,
} from './amapSdk';

const DATUM: AmapClusterDatum = {
  lnglat: [121.4737, 31.2304],
  pointId: 'shanghai',
  assetCount: 2,
};

describe('readAmapClusterData', () => {
  it('reads aggregate callback data from clusterData', () => {
    expect(readAmapClusterData({ clusterData: [DATUM] })).toEqual([DATUM]);
  });

  it('reads single-marker callback data from the AMap data field', () => {
    expect(readAmapClusterData({ data: [DATUM] })).toEqual([DATUM]);
  });

  it('returns an empty array when the callback has no data', () => {
    expect(readAmapClusterData({})).toEqual([]);
  });
});

describe('resolveAmapClusterData', () => {
  it('finds the expected number of nearest points when AMap omits cluster members', () => {
    const nearby: AmapClusterDatum = {
      lnglat: [121.474, 31.231],
      pointId: 'nearby',
      assetCount: 1,
    };
    const distant: AmapClusterDatum = {
      lnglat: [116.4074, 39.9042],
      pointId: 'beijing',
      assetCount: 1,
    };
    const marker = {
      getPosition: () => ({ getLng: () => 121.4738, getLat: () => 31.2306 }),
    } as unknown as AMap.Marker;
    const context = {
      count: 2,
      clusterData: [DATUM],
      marker,
    } satisfies AmapClusterRenderContext;

    expect(resolveAmapClusterData(context, [DATUM, nearby, distant]))
      .toEqual([DATUM, nearby]);
  });
});

describe('reverseGeocode', () => {
  function createNamespace(status: string, result: unknown) {
    class Geocoder {
      getAddress(
        _coordinate: [number, number],
        callback: (callbackStatus: string, callbackResult: unknown) => void,
      ) {
        callback(status, result);
      }
    }
    return { Geocoder } as unknown as Parameters<typeof reverseGeocode>[0];
  }

  it('returns the formatted address for a successful response', async () => {
    await expect(reverseGeocode(
      createNamespace('complete', { regeocode: { formattedAddress: '上海市黄浦区' } }),
      { longitude: 121.4737, latitude: 31.2304, address: '' },
    )).resolves.toBe('上海市黄浦区');
  });

  it('rejects instead of silently treating coordinates as an address', async () => {
    await expect(reverseGeocode(
      createNamespace('error', { info: 'AMAP_SERVICE_UNAVAILABLE' }),
      { longitude: 121.4737, latitude: 31.2304, address: '' },
    )).rejects.toThrow('AMAP_REVERSE_GEOCODE_FAILED');
  });
});
