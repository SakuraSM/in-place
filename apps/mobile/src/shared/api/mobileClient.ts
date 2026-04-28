import { createApiClient } from '@inplace/api-client';
import { createActivityApi, createAiApi, createCategoriesApi, createItemsApi, createTagsApi } from '@inplace/app-core';
import { Platform } from 'react-native';
import { secureServerConfigStorage } from '@/platform/config/secureServerConfigStorage';
import { secureTokenStorage } from '@/platform/auth/secureTokenStorage';

const runtimeEnv = globalThis as {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

function resolveDefaultMobileApiBaseUrl() {
  // 10.0.2.2 is the standard loopback alias for Android Emulator to reach the host machine.
  // For iOS simulators and physical devices, use your computer's local IP (e.g., 192.168.x.x).
  const defaultBaseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://127.0.0.1:4000';
  return runtimeEnv.process?.env?.EXPO_PUBLIC_API_BASE_URL?.trim() || defaultBaseUrl;
}

export function normalizeMobileApiBaseUrl(rawBaseUrl: string) {
  try {
    const url = new URL(rawBaseUrl);
    const normalizedPath = url.pathname.replace(/\/+$/, '');

    if (!normalizedPath || normalizedPath === '') {
      url.pathname = '/api';
      return url.toString().replace(/\/+$/, '');
    }

    if (normalizedPath === '/api' || normalizedPath.startsWith('/api/')) {
      url.pathname = normalizedPath;
      return url.toString().replace(/\/+$/, '');
    }

    url.pathname = `${normalizedPath}/api`;
    return url.toString().replace(/\/+$/, '');
  } catch {
    const trimmed = rawBaseUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
}

const mobileApiClientConfig = {
  baseUrl: normalizeMobileApiBaseUrl(resolveDefaultMobileApiBaseUrl()),
  tokenStorage: secureTokenStorage,
};

export const mobileApiClient = createApiClient(mobileApiClientConfig);

export function getMobileApiBaseUrl() {
  return mobileApiClientConfig.baseUrl;
}

export function setMobileApiBaseUrl(rawBaseUrl: string) {
  mobileApiClientConfig.baseUrl = normalizeMobileApiBaseUrl(rawBaseUrl.trim());
  return mobileApiClientConfig.baseUrl;
}

export async function loadPersistedMobileApiBaseUrl() {
  const storedBaseUrl = await secureServerConfigStorage.getApiBaseUrl();
  if (storedBaseUrl) {
    setMobileApiBaseUrl(storedBaseUrl);
  }

  return mobileApiClientConfig.baseUrl;
}

export async function saveMobileApiBaseUrl(rawBaseUrl: string) {
  const normalizedBaseUrl = setMobileApiBaseUrl(rawBaseUrl);
  await secureServerConfigStorage.setApiBaseUrl(normalizedBaseUrl);
  return normalizedBaseUrl;
}

export const itemsApi = createItemsApi(mobileApiClient.request);
export const categoriesApi = createCategoriesApi(mobileApiClient.request);
export const tagsApi = createTagsApi(mobileApiClient.request);
export const aiApi = createAiApi(mobileApiClient.request);
export const activityApi = createActivityApi(mobileApiClient.request);

function ensureBlobMimeType(sourceBlob: Blob, fallbackMimeType?: string | null) {
  const normalizedFallback = fallbackMimeType?.trim();
  if (sourceBlob.type || !normalizedFallback) {
    return sourceBlob;
  }

  return new Blob([sourceBlob], { type: normalizedFallback });
}

export async function uploadImageFromUri(params: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}) {
  const response = await fetch(params.uri);
  if (!response.ok) {
    throw new Error('图片读取失败，请重新选择后再试');
  }

  const sourceBlob = await response.blob();
  const blob = ensureBlobMimeType(sourceBlob, params.mimeType);
  const formData = new FormData();
  formData.append('file', blob, params.fileName ?? 'upload.jpg');

  const data = await mobileApiClient.request<{ url: string }>('/v1/uploads/images', {
    method: 'POST',
    body: formData,
  });

  return data.url;
}

export async function recognizeItemsFromUri(params: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}) {
  const response = await fetch(params.uri);
  if (!response.ok) {
    throw new Error('图片读取失败，请重新选择后再试');
  }

  const sourceBlob = await response.blob();
  const blob = ensureBlobMimeType(sourceBlob, params.mimeType);
  const formData = new FormData();
  formData.append('image', blob, params.fileName ?? 'scan.jpg');

  const data = await mobileApiClient.request<{ items: import('@inplace/domain').AIRecognitionResult[] }>('/v1/ai/recognize', {
    method: 'POST',
    body: formData,
  });

  return data.items;
}
