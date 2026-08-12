import { apiRequest, resolveApiUrl } from '../../../shared/api/client';
import { createMapsApi, type AmapRuntimeConfig, type MapRuntimeConfig } from '@inplace/app-core';

export type { AmapRuntimeConfig, MapRuntimeConfig };

const mapsApi = createMapsApi(apiRequest, resolveApiUrl);

export async function fetchMapRuntimeConfig(): Promise<MapRuntimeConfig> {
  return mapsApi.fetchRuntimeConfig();
}
