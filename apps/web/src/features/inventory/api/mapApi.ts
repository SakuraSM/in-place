import { apiRequest, resolveApiUrl } from '../../../shared/api/client';

interface DisabledMapConfig {
  enabled: false;
}

export interface AmapRuntimeConfig {
  enabled: true;
  provider: 'amap';
  key: string;
  serviceHost: string;
}

interface AmapServerConfig {
  enabled: true;
  provider: 'amap';
  key: string;
  servicePath: string;
}

type MapServerConfig = DisabledMapConfig | AmapServerConfig;

export type MapRuntimeConfig = DisabledMapConfig | AmapRuntimeConfig;

export async function fetchMapRuntimeConfig(): Promise<MapRuntimeConfig> {
  const config = await apiRequest<MapServerConfig>('/v1/maps/config');
  if (!config.enabled) {
    return config;
  }

  return {
    enabled: true,
    provider: config.provider,
    key: config.key,
    serviceHost: resolveApiUrl(config.servicePath),
  };
}
