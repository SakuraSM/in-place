import { ApiError } from './errors';
import type { TokenStorage } from './token-storage';

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

export interface ApiClientConfig {
  baseUrl: string;
  tokenStorage?: TokenStorage;
  contextHeaders?: () => HeadersInit | Promise<HeadersInit>;
}

export function createApiClient(config: ApiClientConfig) {
  function buildUrl(path: string) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${config.baseUrl}${normalizedPath}`;
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const contextHeaders = await config.contextHeaders?.();
    const headers = new Headers(contextHeaders);
    new Headers(options.headers).forEach((value, key) => headers.set(key, value));
    const token = await config.tokenStorage?.get();

    if (!options.skipAuth && token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(buildUrl(path), {
      ...options,
      credentials: options.credentials ?? 'include',
      headers,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    const payload = text ? JSON.parse(text) as { message?: string } & T : null;

    if (!response.ok) {
      throw new ApiError(payload?.message ?? '请求失败', response.status);
    }

    return payload as T;
  }

  return {
    request,
    resolveUrl: buildUrl,
  };
}
