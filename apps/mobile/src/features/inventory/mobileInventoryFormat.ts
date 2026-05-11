import { getMobileApiBaseUrl } from '@/shared/api/mobileClient';

import type { Item } from '@inplace/domain';

export function resolveInventoryImageUri(url: string | undefined) {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//.test(url)) {
    return url;
  }

  if (url.startsWith('/api/')) {
    try {
      return `${new URL(getMobileApiBaseUrl()).origin}${url}`;
    } catch {
      return url;
    }
  }

  return url;
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

  return names.join(' > ');
}
