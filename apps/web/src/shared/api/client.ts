import { ApiError, createApiClient, type TokenStorage } from '@inplace/api-client';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const AUTH_TOKEN_KEY = 'inplace.auth.token';

const browserTokenStorage: TokenStorage = {
  get() {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  },
  set(token: string | null) {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
      return;
    }

    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  },
};

const apiClient = createApiClient({
  baseUrl: apiBaseUrl,
  tokenStorage: browserTokenStorage,
});

export { ApiError };

export function resolveApiUrl(path: string) {
  return apiClient.resolveUrl(path);
}

export async function apiRequest<T>(path: string, options: RequestInit & { skipAuth?: boolean } = {}): Promise<T> {
  return apiClient.request<T>(path, options);
}

export async function getStoredAuthToken() {
  return browserTokenStorage.get();
}

export async function setStoredAuthToken(token: string | null) {
  await browserTokenStorage.set(token);
}
