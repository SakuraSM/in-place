import { items, tagRegistry } from '@inplace/db';
import { and, asc, count, eq } from 'drizzle-orm';
import { getDb } from '../../lib/db.js';
import type { CreateTagInput, ListTagsQuery, UpdateTagInput } from './tag.schemas.js';

function normalizeTagName(name: string) {
  return name.trim();
}

function sameTagName(left: string, right: string) {
  return normalizeTagName(left).toLocaleLowerCase('zh-CN') === normalizeTagName(right).toLocaleLowerCase('zh-CN');
}

function dedupeTagNames(names: string[]) {
  const unique: string[] = [];

  for (const name of names.map(normalizeTagName).filter(Boolean)) {
    if (!unique.some((value) => sameTagName(value, name))) {
      unique.push(name);
    }
  }

  return unique;
}

async function findTagByName(userId: string, name: string) {
  const allTags = await getDb()
    .select()
    .from(tagRegistry)
    .where(eq(tagRegistry.userId, userId));

  return allTags.find((tag) => sameTagName(tag.name, name)) ?? null;
}

export async function listTagsForUser(userId: string, query: ListTagsQuery = {}) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 24;
  const usePagination = query.page !== undefined || query.pageSize !== undefined;
  const where = eq(tagRegistry.userId, userId);

  const [totalRow] = await getDb()
    .select({ value: count() })
    .from(tagRegistry)
    .where(where);

  const total = Number(totalRow?.value ?? 0);

  const rowsQuery = getDb()
    .select()
    .from(tagRegistry)
    .where(where)
    .orderBy(asc(tagRegistry.name));

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

export async function ensureTagsForUser(userId: string, names: string[]) {
  const normalizedNames = dedupeTagNames(names);
  if (normalizedNames.length === 0) {
    return;
  }

  const existing = (await listTagsForUser(userId)).data;
  const missing = normalizedNames.filter((name) => !existing.some((tag) => sameTagName(tag.name, name)));

  if (missing.length === 0) {
    return;
  }

  await getDb().insert(tagRegistry).values(
    missing.map((name) => ({
      userId,
      name,
      description: '',
      color: 'sky',
    })),
  );
}

export async function createTagForUser(userId: string, input: CreateTagInput) {
  const existing = await findTagByName(userId, input.name);
  if (existing) {
    throw new Error('标签名称已存在');
  }

  const [tag] = await getDb()
    .insert(tagRegistry)
    .values({
      userId,
      name: normalizeTagName(input.name),
      description: input.description,
      color: input.color,
    })
    .returning();

  return tag ?? null;
}

export async function updateTagForUser(userId: string, tagId: string, input: UpdateTagInput) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [currentTag] = await tx
      .select()
      .from(tagRegistry)
      .where(and(eq(tagRegistry.id, tagId), eq(tagRegistry.userId, userId)))
      .limit(1);

    if (!currentTag) {
      return null;
    }

    const nextName = input.name !== undefined ? normalizeTagName(input.name) : currentTag.name;

    if (input.name && !sameTagName(currentTag.name, nextName)) {
      const allTags = await tx
        .select()
        .from(tagRegistry)
        .where(eq(tagRegistry.userId, userId));

      const existing = allTags.find((tag) => sameTagName(tag.name, nextName));
      if (existing && existing.id !== tagId) {
        throw new Error('标签名称已存在');
      }
    }

    if (input.name && !sameTagName(currentTag.name, nextName)) {
      const userItems = await tx
        .select({ id: items.id, tags: items.tags })
        .from(items)
        .where(eq(items.userId, userId));

      for (const item of userItems) {
        const nextTags = dedupeTagNames(item.tags.map((tag) => (sameTagName(tag, currentTag.name) ? nextName : tag)));
        const changed = nextTags.length !== item.tags.length
          || nextTags.some((tag, index) => tag !== item.tags[index]);

        if (changed) {
          await tx
            .update(items)
            .set({
              tags: nextTags,
              updatedAt: new Date(),
            })
            .where(eq(items.id, item.id));
        }
      }
    }

    const [updated] = await tx
      .update(tagRegistry)
      .set({
        ...(input.name !== undefined ? { name: nextName } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(tagRegistry.id, tagId), eq(tagRegistry.userId, userId)))
      .returning();

    return updated ?? null;
  });
}

export async function deleteTagForUser(userId: string, tagId: string) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [currentTag] = await tx
      .select()
      .from(tagRegistry)
      .where(and(eq(tagRegistry.id, tagId), eq(tagRegistry.userId, userId)))
      .limit(1);

    if (!currentTag) {
      return null;
    }

    const userItems = await tx
      .select({ id: items.id, tags: items.tags })
      .from(items)
      .where(eq(items.userId, userId));

    for (const item of userItems) {
      const nextTags = item.tags.filter((tag) => !sameTagName(tag, currentTag.name));
      if (nextTags.length !== item.tags.length) {
        await tx
          .update(items)
          .set({
            tags: nextTags,
            updatedAt: new Date(),
          })
          .where(eq(items.id, item.id));
      }
    }

    const [deleted] = await tx
      .delete(tagRegistry)
      .where(and(eq(tagRegistry.id, tagId), eq(tagRegistry.userId, userId)))
      .returning({ id: tagRegistry.id });

    return deleted ?? null;
  });
}
