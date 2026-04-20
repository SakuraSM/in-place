import { categories, items, tagRegistry, type Item } from '@inplace/db';
import { and, asc, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { CreateItemInput, ImportInventoryInput, ListItemsQuery, UpdateItemInput } from './item.schemas.js';
import { getDb } from '../../lib/db.js';
import { ensureTagsForUser } from '../tags/tag.repository.js';

function normalizePrice(value: string | number | null | undefined) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue.toFixed(2);
}

function toCreateValues(input: CreateItemInput) {
  return {
    parentId: input.parentId ?? null,
    type: input.type,
    name: input.name,
    description: input.description,
    category: input.category,
    price: normalizePrice(input.price),
    quantity: input.quantity,
    purchaseDate: input.purchaseDate ?? null,
    warrantyDate: input.warrantyDate ?? null,
    status: input.status,
    images: input.images,
    tags: sanitizeTags(input.tags),
    metadata: input.metadata,
  };
}

function toUpdateValues(input: UpdateItemInput) {
  return {
    ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.price !== undefined ? { price: normalizePrice(input.price) } : {}),
    ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
    ...(input.purchaseDate !== undefined ? { purchaseDate: input.purchaseDate } : {}),
    ...(input.warrantyDate !== undefined ? { warrantyDate: input.warrantyDate } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.images !== undefined ? { images: input.images } : {}),
    ...(input.tags !== undefined ? { tags: sanitizeTags(input.tags) } : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
  };
}

function sanitizeTags(tags: string[]) {
  const unique: string[] = [];

  for (const tag of tags.map((value) => value.trim()).filter(Boolean)) {
    if (!unique.some((value) => value.toLocaleLowerCase('zh-CN') === tag.toLocaleLowerCase('zh-CN'))) {
      unique.push(tag);
    }
  }

  return unique;
}

export async function listItemsForUser(userId: string, query: ListItemsQuery) {
  const filters = [eq(items.userId, userId)];

  if (query.parentId) {
    filters.push(eq(items.parentId, query.parentId));
  } else if (query.rootOnly) {
    filters.push(isNull(items.parentId));
  }

  if (query.type) {
    filters.push(eq(items.type, query.type));
  }

  if (query.status) {
    filters.push(eq(items.status, query.status));
  }

  if (query.query) {
    const keyword = `%${query.query}%`;
    filters.push(or(
      ilike(items.name, keyword),
      ilike(items.description, keyword),
      ilike(items.category, keyword),
    )!);
  }
  const where = and(...filters);
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const usePagination = query.page !== undefined || query.pageSize !== undefined;

  const [totalRow] = await getDb()
    .select({ value: count() })
    .from(items)
    .where(where);

  const total = Number(totalRow?.value ?? 0);

  const rowsQuery = getDb()
    .select()
    .from(items)
    .where(where)
    .orderBy(desc(items.type), asc(items.name));

  const rows = usePagination
    ? await rowsQuery.limit(pageSize).offset((page - 1) * pageSize)
    : await rowsQuery;

  const effectivePageSize = usePagination ? pageSize : Math.max(rows.length, 1);
  const totalPages = usePagination
    ? Math.max(1, Math.ceil(total / pageSize))
    : 1;

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

export async function getItemStatsForUser(userId: string) {
  const [totalsRow] = await getDb()
    .select({
      total: count(),
      containers: sql<number>`coalesce(sum(case when ${items.type} = 'container' then 1 else 0 end), 0)`,
      inventoryItems: sql<number>`coalesce(sum(case when ${items.type} = 'item' then 1 else 0 end), 0)`,
      borrowed: sql<number>`coalesce(sum(case when ${items.status} = 'borrowed' then 1 else 0 end), 0)`,
    })
    .from(items)
    .where(eq(items.userId, userId));

  return {
    total: Number(totalsRow?.total ?? 0),
    containers: Number(totalsRow?.containers ?? 0),
    items: Number(totalsRow?.inventoryItems ?? 0),
    borrowed: Number(totalsRow?.borrowed ?? 0),
  };
}

export async function exportInventoryForUser(userId: string) {
  const [itemRows, categoryRows, tagRows] = await Promise.all([
    getDb()
      .select()
      .from(items)
      .where(eq(items.userId, userId))
      .orderBy(asc(items.name)),
    getDb()
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(asc(categories.itemType), asc(categories.name)),
    getDb()
      .select()
      .from(tagRegistry)
      .where(eq(tagRegistry.userId, userId))
      .orderBy(asc(tagRegistry.name)),
  ]);

  return {
    items: itemRows,
    categories: categoryRows,
    tags: tagRows,
  };
}

function parseImportedDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function importInventoryForUser(userId: string, snapshot: ImportInventoryInput) {
  const db = getDb();
  const snapshotItemMap = new Map(snapshot.items.map((item) => [item.id, item]));

  for (const item of snapshot.items) {
    if (!item.parent_id) {
      continue;
    }

    const parent = snapshotItemMap.get(item.parent_id);
    if (parent && parent.type !== 'container') {
      throw new Error('导入数据中的上级位置必须是收纳或位置类型');
    }
  }

  return db.transaction(async (tx) => {
    await tx.delete(items).where(eq(items.userId, userId));
    await tx.delete(categories).where(eq(categories.userId, userId));
    await tx.delete(tagRegistry).where(eq(tagRegistry.userId, userId));

    if (snapshot.categories.length > 0) {
      await tx.insert(categories).values(
        snapshot.categories.map((category) => ({
          id: randomUUID(),
          userId,
          itemType: category.item_type,
          name: category.name,
          icon: category.icon,
          color: category.color,
          createdAt: parseImportedDate(category.created_at) ?? new Date(),
        })),
      );
    }

    if (snapshot.tags.length > 0) {
      await tx.insert(tagRegistry).values(
        snapshot.tags.map((tag) => ({
          id: randomUUID(),
          userId,
          name: tag.name,
          description: tag.description,
          color: tag.color,
          createdAt: parseImportedDate(tag.created_at) ?? new Date(),
          updatedAt: parseImportedDate(tag.updated_at) ?? new Date(),
        })),
      );
    }

    const pendingItems = [...snapshot.items];
    const insertedIds = new Set<string>();
    const itemIdMap = new Map(snapshot.items.map((item) => [item.id, randomUUID()]));

    while (pendingItems.length > 0) {
      const readyItems = pendingItems.filter((item) => item.parent_id === null || insertedIds.has(item.parent_id));
      if (readyItems.length === 0) {
        throw new Error('导入数据中的物品层级无效，请检查备份文件');
      }

      await tx.insert(items).values(
        readyItems.map((item) => ({
          id: itemIdMap.get(item.id) ?? randomUUID(),
          userId,
          parentId: item.parent_id ? (itemIdMap.get(item.parent_id) ?? null) : null,
          type: item.type,
          name: item.name,
          description: item.description,
          category: item.category,
          price: normalizePrice(item.price),
          quantity: item.quantity,
          purchaseDate: parseImportedDate(item.purchase_date),
          warrantyDate: parseImportedDate(item.warranty_date),
          status: item.status,
          images: item.images,
          tags: sanitizeTags(item.tags),
          metadata: item.metadata,
          createdAt: parseImportedDate(item.created_at) ?? new Date(),
          updatedAt: parseImportedDate(item.updated_at) ?? new Date(),
        })),
      );

      for (const item of readyItems) {
        insertedIds.add(item.id);
      }

      const readyIds = new Set(readyItems.map((item) => item.id));
      for (let index = pendingItems.length - 1; index >= 0; index -= 1) {
        if (readyIds.has(pendingItems[index]!.id)) {
          pendingItems.splice(index, 1);
        }
      }
    }

    return {
      categories: snapshot.categories.length,
      tags: snapshot.tags.length,
      items: snapshot.items.length,
    };
  });
}

export async function findItemByIdForUser(userId: string, itemId: string) {
  const [item] = await getDb()
    .select()
    .from(items)
    .where(and(
      eq(items.id, itemId),
      eq(items.userId, userId),
    ))
    .limit(1);

  return item ?? null;
}

export async function listAncestorsForUser(userId: string, itemId: string) {
  const ancestors: Item[] = [];
  let currentId: string | null = itemId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const item = await findItemByIdForUser(userId, currentId);
    if (!item) {
      break;
    }

    ancestors.unshift(item);
    currentId = item.parentId;
  }

  return ancestors;
}

export type ParentValidationResult = 'valid' | 'not_found' | 'not_container';

export async function validateParentForUser(userId: string, parentId: string | null | undefined): Promise<ParentValidationResult> {
  if (!parentId) {
    return 'valid';
  }

  const [parent] = await getDb()
    .select({ id: items.id, type: items.type })
    .from(items)
    .where(and(
      eq(items.id, parentId),
      eq(items.userId, userId),
    ))
    .limit(1);

  if (!parent) {
    return 'not_found';
  }

  return parent.type === 'container' ? 'valid' : 'not_container';
}

export async function itemHasChildrenForUser(userId: string, itemId: string) {
  const [row] = await getDb()
    .select({ value: count() })
    .from(items)
    .where(and(
      eq(items.userId, userId),
      eq(items.parentId, itemId),
    ));

  return Number(row?.value ?? 0) > 0;
}

export async function wouldCreateParentCycleForUser(userId: string, itemId: string, parentId: string | null) {
  let currentId = parentId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    if (currentId === itemId) {
      return true;
    }

    visited.add(currentId);
    const parent = await findItemByIdForUser(userId, currentId);
    currentId = parent?.parentId ?? null;
  }

  return false;
}

export async function createItemForUser(userId: string, input: CreateItemInput) {
  const normalizedInput = {
    ...input,
    tags: sanitizeTags(input.tags),
  };

  const [item] = await getDb()
    .insert(items)
    .values({
      userId,
      ...toCreateValues(normalizedInput),
    })
    .returning();

  await ensureTagsForUser(userId, normalizedInput.tags);
  return item ?? null;
}

export async function updateItemForUser(userId: string, itemId: string, input: UpdateItemInput) {
  const normalizedInput = input.tags !== undefined
    ? { ...input, tags: sanitizeTags(input.tags) }
    : input;

  const [item] = await getDb()
    .update(items)
    .set(toUpdateValues(normalizedInput))
    .where(and(
      eq(items.id, itemId),
      eq(items.userId, userId),
    ))
    .returning();

  if (normalizedInput.tags !== undefined) {
    await ensureTagsForUser(userId, normalizedInput.tags);
  }
  return item ?? null;
}

export async function deleteItemForUser(userId: string, itemId: string) {
  const [item] = await getDb()
    .delete(items)
    .where(and(
      eq(items.id, itemId),
      eq(items.userId, userId),
    ))
    .returning({ id: items.id });

  return item ?? null;
}
