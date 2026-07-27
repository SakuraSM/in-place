import { readFile } from 'node:fs/promises';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { categories, deletedCategoryPresets } from '@inplace/db';

const migrationUrl = new URL(
  '../../../../../packages/db/migrations/0011_drop_user_scoped_category_preset_indexes.sql',
  import.meta.url,
);

describe('household category preset indexes', () => {
  it('scopes preset uniqueness to households in the Drizzle schema', () => {
    const categoryIndexes = getTableConfig(categories).indexes.map((index) => index.config.name);
    const deletedPresetIndexes = getTableConfig(deletedCategoryPresets).indexes.map((index) => index.config.name);

    expect(categoryIndexes).toContain('categories_household_preset_idx');
    expect(categoryIndexes).not.toContain('categories_user_preset_idx');
    expect(deletedPresetIndexes).toContain('deleted_category_presets_household_preset_idx');
    expect(deletedPresetIndexes).not.toContain('deleted_category_presets_user_preset_idx');
  });

  it('drops the legacy user-scoped unique indexes for existing databases', async () => {
    const migration = await readFile(migrationUrl, 'utf8');

    expect(migration).toContain('drop index if exists categories_user_preset_idx;');
    expect(migration).toContain('drop index if exists deleted_category_presets_user_preset_idx;');
  });
});
