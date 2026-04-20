import type { ActivityLog, PaginatedResult, PaginationMeta } from '@inplace/domain';
import type { AppCoreRequest } from './shared';

type ServerActivityLog = {
  id: string;
  userId: string;
  itemId: string | null;
  itemType: ActivityLog['item_type'];
  itemName: string;
  action: ActivityLog['action'];
  metadata: Record<string, unknown>;
  createdAt: string;
};

function mapActivityLog(entry: ServerActivityLog): ActivityLog {
  return {
    id: entry.id,
    user_id: entry.userId,
    item_id: entry.itemId,
    item_type: entry.itemType,
    item_name: entry.itemName,
    action: entry.action,
    metadata: entry.metadata,
    created_at: entry.createdAt,
  };
}

function normalizePaginationMeta(meta: Partial<PaginationMeta> | undefined, fallbackCount: number): PaginationMeta {
  return {
    page: meta?.page ?? 1,
    pageSize: meta?.pageSize ?? fallbackCount,
    total: meta?.total ?? fallbackCount,
    totalPages: meta?.totalPages ?? 1,
    hasNextPage: meta?.hasNextPage ?? false,
  };
}

export function createActivityApi(request: AppCoreRequest) {
  async function fetchActivityLogsPage(userId: string, options: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<PaginatedResult<ActivityLog>> {
    void userId;
    const searchParams = new URLSearchParams();

    if (options.page !== undefined) {
      searchParams.set('page', String(options.page));
    }

    if (options.pageSize !== undefined) {
      searchParams.set('pageSize', String(options.pageSize));
    }

    const suffix = searchParams.toString();
    const response = await request<{ data: ServerActivityLog[]; meta?: Partial<PaginationMeta> }>(`/v1/activity${suffix ? `?${suffix}` : ''}`);
    const data = response.data.map(mapActivityLog);
    return {
      data,
      meta: normalizePaginationMeta(response.meta, data.length),
    };
  }

  return {
    fetchActivityLogsPage,
  };
}
