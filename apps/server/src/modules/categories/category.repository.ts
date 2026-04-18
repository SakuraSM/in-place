import { categories } from '@inplace/db';
import { and, asc, eq } from 'drizzle-orm';
import type { CreateCategoryInput, ListCategoriesQuery, UpdateCategoryInput } from './category.schemas.js';
import { getDb } from '../../lib/db.js';

export async function listCategoriesForUser(userId: string, query: ListCategoriesQuery) {
  const filters = [eq(categories.userId, userId)];
  if (query.itemType) {
    filters.push(eq(categories.itemType, query.itemType));
  }

  return getDb()
    .select()
    .from(categories)
    .where(and(...filters))
    .orderBy(asc(categories.name));
}

export async function createCategoryForUser(userId: string, input: CreateCategoryInput) {
  const [category] = await getDb()
    .insert(categories)
    .values({
      userId,
      itemType: input.itemType,
      name: input.name,
      icon: input.icon,
      color: input.color,
    })
    .returning();

  return category ?? null;
}

export async function updateCategoryForUser(userId: string, categoryId: string, input: UpdateCategoryInput) {
  const [category] = await getDb()
    .update(categories)
    .set(input)
    .where(and(
      eq(categories.id, categoryId),
      eq(categories.userId, userId),
    ))
    .returning();

  return category ?? null;
}

export async function deleteCategoryForUser(userId: string, categoryId: string) {
  const [category] = await getDb()
    .delete(categories)
    .where(and(
      eq(categories.id, categoryId),
      eq(categories.userId, userId),
    ))
    .returning({ id: categories.id });

  return category ?? null;
}
