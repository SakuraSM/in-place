import type { AppCoreRequest } from './shared';

export interface DisabledMapConfig {
  enabled: false;
}

export interface AmapServerConfig {
  enabled: true;
  provider: 'amap';
  key: string;
  servicePath: string;
}

export type MapServerConfig = DisabledMapConfig | AmapServerConfig;

export interface AmapRuntimeConfig {
  enabled: true;
  provider: 'amap';
  key: string;
  serviceHost: string;
}

export type MapRuntimeConfig = DisabledMapConfig | AmapRuntimeConfig;

export function createMapsApi(request: AppCoreRequest, resolveServiceUrl: (path: string) => string) {
  return {
    async fetchRuntimeConfig(): Promise<MapRuntimeConfig> {
      const config = await request<MapServerConfig>('/v1/maps/config');
      if (!config.enabled) return config;
      return {
        enabled: true,
        provider: config.provider,
        key: config.key,
        serviceHost: resolveServiceUrl(config.servicePath),
      };
    },
  };
}
