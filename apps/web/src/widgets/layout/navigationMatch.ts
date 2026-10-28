export type NavigationMatchMode = 'exact' | 'section';

interface NavigationMatchInput {
  pathname: string;
  targetPath: string;
  mode?: NavigationMatchMode;
}

export function isNavigationPathActive({
  pathname,
  targetPath,
  mode = 'section',
}: NavigationMatchInput): boolean {
  if (mode === 'exact' || targetPath === '/') {
    return pathname === targetPath;
  }

  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

const MOBILE_SECTION_ROUTES: Record<string, readonly string[]> = {
  '/overview': ['/overview', '/item', '/container'],
  '/manage': ['/manage', '/categories', '/tags', '/locations', '/activity', '/stocktakes', '/reminders', '/reports', '/duplicates', '/labels', '/scan/codes', '/s'],
  '/profile': ['/profile', '/household'],
};

export function isMobileNavigationPathActive(input: NavigationMatchInput): boolean {
  const routes = MOBILE_SECTION_ROUTES[input.targetPath];
  return routes ? routes.some(targetPath => isNavigationPathActive({ pathname: input.pathname, targetPath })) : isNavigationPathActive(input);
}
