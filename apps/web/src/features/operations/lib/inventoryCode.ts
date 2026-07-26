export { parseInventoryCode } from '@inplace/app-core';

export function buildInventoryCodeUrl(code: string) {
  return `${window.location.origin}/s/${code}`;
}

export interface RecentInventoryScan {
  code: string;
  name: string;
  entityKind: 'location' | 'container' | 'item';
  scannedAt: string;
}

const RECENT_SCANS_KEY = 'inplace.recent-scans';

export function readRecentInventoryScans(): RecentInventoryScan[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RECENT_SCANS_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is RecentInventoryScan => (
      typeof entry === 'object' && entry !== null
      && 'code' in entry && typeof entry.code === 'string'
      && 'name' in entry && typeof entry.name === 'string'
      && 'entityKind' in entry && ['location', 'container', 'item'].includes(String(entry.entityKind))
      && 'scannedAt' in entry && typeof entry.scannedAt === 'string'
    )).slice(0, 8);
  } catch {
    return [];
  }
}

export function rememberInventoryScan(scan: Omit<RecentInventoryScan, 'scannedAt'>) {
  const next = [
    { ...scan, scannedAt: new Date().toISOString() },
    ...readRecentInventoryScans().filter((entry) => entry.code !== scan.code),
  ].slice(0, 8);
  window.localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(next));
}
