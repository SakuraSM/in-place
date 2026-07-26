const OPAQUE_CODE_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseInventoryCode(value: string) {
  const trimmed = value.trim();
  const pathMatch = trimmed.match(/(?:^|\/)s\/([A-Za-z0-9_-]{20,64})(?:[/?#]|$)/);
  const candidate = pathMatch?.[1] ?? trimmed;
  return OPAQUE_CODE_PATTERN.test(candidate) && !UUID_PATTERN.test(candidate) ? candidate : null;
}

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
