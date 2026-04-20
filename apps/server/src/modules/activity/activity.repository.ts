import { activityLogs, type ActivityLog as DbActivityLog } from '@inplace/db';
import { count, desc, eq } from 'drizzle-orm';
import { getDb } from '../../lib/db.js';
import type { ListActivityLogsQuery } from './activity.schemas.js';

export async function listActivityLogsForUser(userId: string, query: ListActivityLogsQuery = {}) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const usePagination = query.page !== undefined || query.pageSize !== undefined;
  const where = eq(activityLogs.userId, userId);

  const [totalRow] = await getDb()
    .select({ value: count() })
    .from(activityLogs)
    .where(where);

  const total = Number(totalRow?.value ?? 0);

  const rowsQuery = getDb()
    .select()
    .from(activityLogs)
    .where(where)
    .orderBy(desc(activityLogs.createdAt));

  const rows = usePagination
    ? await rowsQuery.limit(pageSize).offset((page - 1) * pageSize)
    : await rowsQuery;

  const effectivePageSize = usePagination ? pageSize : Math.max(rows.length, 1);
  const totalPages = usePagination ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  return {
    data: rows,
    meta: {
      page: usePagination ? page : 1,
      pageSize: effectivePageSize,
      total,
      totalPages,
      hasNextPage: usePagination ? page < totalPages : false,
    },
  };
}

export async function createActivityLogForUser(input: {
  userId: string;
  itemId?: string | null;
  itemType: DbActivityLog['itemType'];
  itemName: string;
  action: DbActivityLog['action'];
  metadata?: Record<string, unknown>;
}) {
  const [entry] = await getDb()
    .insert(activityLogs)
    .values({
      userId: input.userId,
      itemId: input.itemId ?? null,
      itemType: input.itemType,
      itemName: input.itemName,
      action: input.action,
      metadata: input.metadata ?? {},
    })
    .returning();

  return entry ?? null;
}
