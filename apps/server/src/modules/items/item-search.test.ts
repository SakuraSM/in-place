import { describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { items } from '@inplace/db';
import { buildItemKeywordFilter } from './item-search.js';

describe('inventory keyword query', () => {
  it('uses parameterized text matching for names, descriptions, categories and individual tags', () => {
    const db = drizzle.mock();
    const query = db.select().from(items).where(buildItemKeywordFilter("travel'gear")).toSQL();
    expect(query.sql).toContain('jsonb_array_elements_text');
    expect(query.sql).not.toContain("travel'gear");
    expect(query.params).toEqual(Array(4).fill("%travel'gear%"));
  });
});
