import { items } from '@inplace/db';
import { and, eq, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { ListItemsQuery } from './item.schemas.js';
import { buildItemKeywordFilter } from './item-search.js';

export function buildItemListFilter(householdId: string, query: ListItemsQuery): SQL | undefined {
  const filters: SQL[] = [eq(items.householdId, householdId)];
  if (query.parentId) filters.push(eq(items.parentId, query.parentId));
  else if (query.rootOnly) filters.push(isNull(items.parentId));
  if (query.type) filters.push(eq(items.type, query.type));
  if (query.status) filters.push(eq(items.status, query.status));
  if (query.query) filters.push(buildItemKeywordFilter(query.query));
  if (query.locationOnly) {
    filters.push(eq(items.type, 'container'), sql`${items.metadata}->'location_tag' = 'true'::jsonb`);
  }
  if (query.locationId) {
    filters.push(sql`${items.id} in (
      with recursive descendants as (
        select id from items where household_id = ${householdId} and parent_id = ${query.locationId}
        union
        select child.id from items child inner join descendants parent on child.parent_id = parent.id
        where child.household_id = ${householdId}
      ) select id from descendants
    )`);
  }
  if (query.tags.length) {
    const tagFilter = or(...query.tags.map((tag) => sql`${items.tags} @> ${JSON.stringify([tag])}::jsonb`));
    if (tagFilter) filters.push(tagFilter);
  }
  return and(...filters);
}
