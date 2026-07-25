import type { ItemStatus, ItemType } from '../../../legacy/database.types';

export type OverviewTypeFilter = ItemType | 'all' | 'location';
export type OverviewStatusFilter = ItemStatus | 'all';

export interface OverviewSearchState {
  q: string;
  type: OverviewTypeFilter;
  status: OverviewStatusFilter;
  locationId: string | null;
  tags: string[];
  page: number;
  pageSize: number;
}

export const DEFAULT_OVERVIEW_PAGE_SIZE = 24;
export const OVERVIEW_PAGE_SIZES = [12, 24, 48, 96] as const;

const VALID_TYPES = new Set<OverviewTypeFilter>(['all', 'location', 'container', 'item']);
const VALID_STATUSES = new Set<OverviewStatusFilter>(['all', 'in_stock', 'borrowed', 'worn_out']);

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseOverviewSearchParams(params: URLSearchParams): OverviewSearchState {
  const typeParam = params.get('type') as OverviewTypeFilter | null;
  const statusParam = params.get('status') as OverviewStatusFilter | null;
  const parsedPageSize = parsePositiveInteger(params.get('pageSize'), DEFAULT_OVERVIEW_PAGE_SIZE);
  const type = typeParam && VALID_TYPES.has(typeParam) ? typeParam : 'all';
  const status = statusParam && VALID_STATUSES.has(statusParam) ? statusParam : 'all';

  return {
    q: params.get('q')?.trim() ?? '',
    type,
    status: type === 'location' || type === 'container' ? 'all' : status,
    locationId: params.get('locationId')?.trim() || null,
    tags: Array.from(new Set(params.getAll('tag').map((tag) => tag.trim()).filter(Boolean))),
    page: parsePositiveInteger(params.get('page'), 1),
    pageSize: OVERVIEW_PAGE_SIZES.includes(parsedPageSize as (typeof OVERVIEW_PAGE_SIZES)[number])
      ? parsedPageSize
      : DEFAULT_OVERVIEW_PAGE_SIZE,
  };
}

export function serializeOverviewSearchState(state: OverviewSearchState): URLSearchParams {
  const params = new URLSearchParams();
  const query = state.q.trim();

  if (query) {
    params.set('q', query);
  }
  if (state.type !== 'all') {
    params.set('type', state.type);
  }
  if (
    state.status !== 'all'
    && state.type !== 'location'
    && state.type !== 'container'
  ) {
    params.set('status', state.status);
  }
  if (state.locationId) {
    params.set('locationId', state.locationId);
  }
  state.tags.forEach((tag) => params.append('tag', tag));
  params.set('page', String(Math.max(1, Math.floor(state.page))));
  params.set('pageSize', String(
    OVERVIEW_PAGE_SIZES.includes(state.pageSize as (typeof OVERVIEW_PAGE_SIZES)[number])
      ? state.pageSize
      : DEFAULT_OVERVIEW_PAGE_SIZE,
  ));

  return params;
}

export function countActiveOverviewFilters(state: OverviewSearchState) {
  return Number(Boolean(state.q))
    + Number(state.type !== 'all')
    + Number(state.status !== 'all')
    + Number(Boolean(state.locationId))
    + state.tags.length;
}
