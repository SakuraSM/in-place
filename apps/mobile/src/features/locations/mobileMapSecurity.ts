export function isAllowedMobileMapNavigation(url: string, webBaseUrl: string) {
  if (url === 'about:blank') return true;
  try {
    const targetUrl = new URL(url);
    const allowedUrl = new URL(webBaseUrl);
    return targetUrl.origin === allowedUrl.origin && targetUrl.pathname === '/mobile-map';
  } catch {
    return false;
  }
}
