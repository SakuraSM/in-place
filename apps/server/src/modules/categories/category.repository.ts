import { categories, deletedCategoryPresets, items } from '@inplace/db';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { CreateCategoryInput, ListCategoriesQuery, UpdateCategoryInput } from './category.schemas.js';
import { getDb } from '../../lib/db.js';
import {
  categoryIdentity,
  DEFAULT_CATEGORY_PRESETS,
  itemTypeForCategoryScope,
} from './category-presets.js';

export async function listCategoriesForHousehold(householdId: string, query: ListCategoriesQuery) {
  const filters = [eq(categories.householdId, householdId)];
  if (query.itemType) {
    filters.push(eq(categories.itemType, query.itemType));
  }
  if (query.scope) {
    filters.push(eq(categories.scope, query.scope));
  }

  return getDb()
    .select()
    .from(categories)
    .where(and(...filters))
    .orderBy(asc(categories.name));
}

export async function createCategoryForHousehold(context: {
  userId: string;
  householdId: string;
}, input: CreateCategoryInput) {
  const [category] = await getDb()
    .insert(categories)
    .values({
      userId: context.userId,
      householdId: context.householdId,
      itemType: itemTypeForCategoryScope(input.scope),
      scope: input.scope,
      name: input.name,
      icon: input.icon,
      color: input.color,
    })
    .returning();

  return category ?? null;
}

export async function updateCategoryForHousehold(householdId: string, categoryId: string, input: UpdateCategoryInput) {
  return getDb().transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.householdId, householdId)))
      .limit(1);

    if (!existing) {
      return null;
    }

    const [category] = await tx
      .update(categories)
      .set(input)
      .where(and(eq(categories.id, categoryId), eq(categories.householdId, householdId)))
      .returning();

    if (input.name && input.name !== existing.name) {
      const scopeFilter = existing.scope === 'item'
        ? eq(items.type, 'item')
        : existing.scope === 'location'
          ? and(eq(items.type, 'container'), sql`${items.metadata} ->> 'location_tag' = 'true'`)
          : and(eq(items.type, 'container'), sql`coalesce(${items.metadata} ->> 'location_tag', 'false') <> 'true'`);

      await tx
        .update(items)
        .set({ category: input.name })
        .where(and(
          eq(items.householdId, householdId),
          eq(items.category, existing.name),
          scopeFilter,
        ));
    }

    return category ?? null;
  });
}

export async function deleteCategoryForHousehold(context: {
  userId: string;
  householdId: string;
}, categoryId: string) {
  return getDb().transaction(async (tx) => {
    const [category] = await tx
      .delete(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.householdId, context.householdId)))
      .returning({ id: categories.id, presetKey: categories.presetKey });

    if (category?.presetKey) {
      await tx
        .insert(deletedCategoryPresets)
        .values({
          userId: context.userId,
          householdId: context.householdId,
          presetKey: category.presetKey,
        })
        .onConflictDoNothing();
    }

    return category ?? null;
  });
}

export async function getCategoryPresetSummary(householdId: string) {
  const [existing, dismissed] = await Promise.all([
    listCategoriesForHousehold(householdId, {}),
    getDb().select().from(deletedCategoryPresets).where(eq(deletedCategoryPresets.householdId, householdId)),
  ]);
  const identities = new Set(existing.map((category) => categoryIdentity(category.scope, category.name)));
  const presetKeys = new Set(existing.map((category) => category.presetKey).filter(Boolean));
  const dismissedKeys = new Set(dismissed.map((entry) => entry.presetKey));
  const missingCount = DEFAULT_CATEGORY_PRESETS.filter((preset) => (
    !dismissedKeys.has(preset.key)
    && !presetKeys.has(preset.key)
    && !identities.has(categoryIdentity(preset.scope, preset.name))
  )).length;

  return {
    total: DEFAULT_CATEGORY_PRESETS.length,
    missingCount,
    dismissedCount: dismissedKeys.size,
  };
}

export async function applyCategoryPresetsForHousehold(context: {
  userId: string;
  householdId: string;
}) {
  return getDb().transaction(async (tx) => {
    const [existing, dismissed] = await Promise.all([
      tx.select().from(categories).where(eq(categories.householdId, context.householdId)),
      tx.select().from(deletedCategoryPresets).where(eq(deletedCategoryPresets.householdId, context.householdId)),
    ]);
    const identities = new Set(existing.map((category) => categoryIdentity(category.scope, category.name)));
    const presetKeys = new Set(existing.map((category) => category.presetKey).filter(Boolean));
    const dismissedKeys = new Set(dismissed.map((entry) => entry.presetKey));
    const missing = DEFAULT_CATEGORY_PRESETS.filter((preset) => (
      !dismissedKeys.has(preset.key)
      && !presetKeys.has(preset.key)
      && !identities.has(categoryIdentity(preset.scope, preset.name))
    ));

    const added = missing.length === 0 ? [] : await tx
      .insert(categories)
      .values(missing.map((preset) => ({
        userId: context.userId,
        householdId: context.householdId,
        itemType: itemTypeForCategoryScope(preset.scope),
        scope: preset.scope,
        presetKey: preset.key,
        name: preset.name,
        icon: preset.icon,
        color: preset.color,
      })))
      .onConflictDoNothing()
      .returning();

    const data = await tx
      .select()
      .from(categories)
      .where(eq(categories.householdId, context.householdId))
      .orderBy(asc(categories.scope), asc(categories.name));

    return {
      addedCount: added.length,
      skippedCount: DEFAULT_CATEGORY_PRESETS.length - added.length,
      data,
    };
  });
}
