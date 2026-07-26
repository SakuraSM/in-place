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
