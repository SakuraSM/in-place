/// <reference types="vite/client" />
/// <reference types="@amap/amap-jsapi-types" />

declare const __APP_VERSION__: string;

interface Window {
  _AMapSecurityConfig?: {
    serviceHost: string;
  };
}
