import type { InventoryFilterState } from './inventory-operations';

export interface InventoryScope {
  server: string;
  userId: string;
  householdId: string;
}

export function inventoryStorageKey(scope: InventoryScope): string {
  return `inplace.saved-filters.v2:${[scope.server.replace(/\/+$/, ''), scope.userId, scope.householdId].map(encodeURIComponent).join(':')}`;
}

export function isInventoryFilterState(value: unknown): value is InventoryFilterState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.q === 'string'
    && typeof candidate.type === 'string' && ['all', 'location', 'container', 'item'].includes(candidate.type)
    && typeof candidate.status === 'string' && ['all', 'in_stock', 'borrowed', 'worn_out'].includes(candidate.status)
    && (candidate.locationId === null || typeof candidate.locationId === 'string')
    && Array.isArray(candidate.tags) && candidate.tags.every((tag) => typeof tag === 'string')
    && typeof candidate.view === 'string' && ['hierarchy', 'flat'].includes(candidate.view);
}

export function normalizeInventoryFilters(filters: InventoryFilterState): InventoryFilterState {
  return {
    q: filters.q.trim(),
    type: filters.type,
    status: filters.type === 'location' || filters.type === 'container' ? 'all' : filters.status,
    locationId: filters.locationId?.trim() || null,
    tags: [...new Set(filters.tags.map((tag) => tag.trim()).filter(Boolean))].sort(),
    view: filters.view,
  };
}

export function normalizeSavedInventoryQuery(query: string): string {
  const params = new URLSearchParams(query);
  params.delete('page');
  params.delete('pageSize');
  const tags = [...new Set(params.getAll('tag').map((tag) => tag.trim()).filter(Boolean))].sort();
  params.delete('tag');
  tags.forEach((tag) => params.append('tag', tag));
  params.sort();
  return params.toString();
}
