import { getMobileApiBaseUrl } from '@/shared/api/mobileClient';

import type { Item } from '@inplace/domain';

const UPLOAD_PATH_PREFIX = '/api/uploads/';
const MOBILE_IMAGE_FORMAT = 'jpeg';
const PATH_SEPARATOR = ' > ';

function resolveMobileApiOrigin() {
  try {
    return new URL(getMobileApiBaseUrl()).origin;
  } catch {
    return null;
  }
}

function formatMobileUploadImageUri(url: URL) {
  url.searchParams.set('format', MOBILE_IMAGE_FORMAT);
  return url.toString();
}

export function resolveMobileUploadUri(url: string | undefined) {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//.test(url)) {
    try {
      const parsedUrl = new URL(url);
      if (!parsedUrl.pathname.startsWith(UPLOAD_PATH_PREFIX)) {
        return url;
      }

      const mobileApiOrigin = resolveMobileApiOrigin();
      if (!mobileApiOrigin) {
        return parsedUrl.toString();
      }

      return new URL(`${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`, mobileApiOrigin).toString();
    } catch {
      return url;
    }
  }

  if (url.startsWith(UPLOAD_PATH_PREFIX)) {
    const mobileApiOrigin = resolveMobileApiOrigin();
    if (!mobileApiOrigin) {
      return url;
    }

    return new URL(url, mobileApiOrigin).toString();
  }

  if (url.startsWith('/api/')) {
    const mobileApiOrigin = resolveMobileApiOrigin();
    return mobileApiOrigin ? `${mobileApiOrigin}${url}` : url;
  }

  return url;
}

export function resolveInventoryImageUri(url: string | undefined) {
  const resolved = resolveMobileUploadUri(url);
  if (!resolved) {
    return null;
  }

  try {
    const parsed = new URL(resolved);
    return parsed.pathname.startsWith(UPLOAD_PATH_PREFIX)
      ? formatMobileUploadImageUri(parsed)
      : resolved;
  } catch {
    return resolved;
  }
}

export function formatInventoryDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN');
}

export function buildMobileItemPath(item: Item, itemMap: Map<string, Item>) {
  const names: string[] = [];
  const visited = new Set<string>();
  let currentParentId = item.parent_id;

  while (currentParentId && !visited.has(currentParentId)) {
    visited.add(currentParentId);
    const parent = itemMap.get(currentParentId);
    if (!parent) {
      break;
    }
    names.unshift(parent.name);
    currentParentId = parent.parent_id;
  }

  return formatMobilePath(names);
}

export function formatMobilePath(names: string[]) {
  return names.filter(Boolean).join(PATH_SEPARATOR);
}

export function formatMobileLocationPath(items: Pick<Item, 'name'>[]) {
  return formatMobilePath(items.map((item) => item.name));
}
