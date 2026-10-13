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

  async function requestResponse(path: string, options: RequestOptions = {}): Promise<Response> {
    const url = buildUrl(path);
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

    const response = await fetch(url, {
      ...options,
      credentials: options.credentials ?? 'include',
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      let message = text || '请求失败';
      try {
        const payload: unknown = JSON.parse(text);
        message = payload && typeof payload === 'object' && 'message' in payload
          && typeof payload.message === 'string' ? payload.message : '请求失败';
      } catch {
        // Plain-text proxy errors are valid failure responses too.
      }
      throw new ApiError(message, response.status);
    }

    return response;
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await requestResponse(path, options);
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
  }

  return {
    request,
    requestResponse,
    resolveUrl: buildUrl,
  };
}
