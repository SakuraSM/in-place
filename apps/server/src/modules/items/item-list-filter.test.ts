import { describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { items } from '@inplace/db';
import { buildItemListFilter } from './item-list-filter.js';

describe('household inventory filtering', () => {
  it('scopes recursive descendants and parameterizes tag values', () => {
    const query = drizzle.mock().select().from(items).where(buildItemListFilter('family', { locationId: 'location', tags: ["travel'gear", 'spare'], locationOnly: true })).toSQL();
    expect(query.sql).toContain('with recursive descendants');
    expect(query.params.filter((value) => value === 'family')).toHaveLength(3);
    expect(query.sql).not.toContain("travel'gear");
    expect(query.params).toContain('["spare"]');
    expect(query.sql).toContain(' or ');
  });
});
