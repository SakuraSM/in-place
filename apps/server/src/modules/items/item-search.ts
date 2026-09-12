import { items } from '@inplace/db';
import { ilike, or, sql, type SQL } from 'drizzle-orm';

export function buildItemKeywordFilter(query: string): SQL {
  const keyword = `%${query}%`;
  return or(
    ilike(items.name, keyword),
    ilike(items.description, keyword),
    ilike(items.category, keyword),
    sql`exists (select 1 from jsonb_array_elements_text(${items.tags}) as inventory_tag(value) where inventory_tag.value ilike ${keyword})`,
  )!;
}
