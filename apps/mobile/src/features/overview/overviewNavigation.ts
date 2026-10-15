import type { Href } from 'expo-router';

export function overviewHref(type = 'all', status = 'all', focus = false): Href {
  return {
    pathname: '/(tabs)/overview',
    params: { q: '', type, status, locationId: '', tag: '', view: 'flat', focus: focus ? 'search' : '' },
  };
}
