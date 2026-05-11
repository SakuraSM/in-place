import type { Href } from 'expo-router';
import type { ItemType } from '@inplace/domain';

export function resolveMobileDetailHref(item: { id: string; type: ItemType }): Href {
  if (item.type === 'container') {
    return {
      pathname: '/container/[id]',
      params: { id: item.id },
    };
  }

  return {
    pathname: '/item/[id]',
    params: { id: item.id },
  };
}

export function resolveMobileContainerBrowseHref(item: { id: string }): Href {
  return {
    pathname: '/container/browse/[id]',
    params: { id: item.id },
  };
}
