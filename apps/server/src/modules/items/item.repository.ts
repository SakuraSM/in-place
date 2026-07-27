import {
  activityLogs,
  attachments,
  categories,
  households,
  inventoryBatches,
  inventoryCodes,
  items,
  loans,
  maintenanceRecords,
  reminders,
  stocktakeEntries,
  stocktakes,
  tagRegistry,
  type Item,
} from '@inplace/db';
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { CreateItemInput, ImportInventoryInput, ListItemsQuery, UpdateItemInput } from './item.schemas.js';
import { getDb } from '../../lib/db.js';
import { ensureTagsForHousehold } from '../tags/tag.repository.js';

interface InventoryContext {
  userId: string;
  householdId: string;
}

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
    trackingMode: input.trackingMode,
    minimumQuantity: input.minimumQuantity,
    expiryDate: input.expiryDate,
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
    ...(input.trackingMode !== undefined ? { trackingMode: input.trackingMode } : {}),
    ...(input.minimumQuantity !== undefined ? { minimumQuantity: input.minimumQuantity } : {}),
    ...(input.expiryDate !== undefined ? { expiryDate: input.expiryDate } : {}),
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

export async function listItemsForHousehold(householdId: string, query: ListItemsQuery) {
  const filters = [eq(items.householdId, householdId)];

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

  const rowsQuery = getDb()
    .select()
    .from(items)
    .where(where)
    .orderBy(desc(items.type), asc(items.name));

  let rows = await rowsQuery;

  if (query.locationOnly) {
    rows = rows.filter((row) => row.type === 'container' && row.metadata?.location_tag === true);
  }

  if (query.locationId) {
    const locationRows = await getDb()
      .select({ id: items.id, parentId: items.parentId })
      .from(items)
      .where(eq(items.householdId, householdId));

    const childrenMap = new Map<string, string[]>();
    for (const row of locationRows) {
      if (!row.parentId) {
        continue;
      }

      const bucket = childrenMap.get(row.parentId) ?? [];
      bucket.push(row.id);
      childrenMap.set(row.parentId, bucket);
    }

    const descendantIds = new Set<string>();
    const stack = [...(childrenMap.get(query.locationId) ?? [])];

    while (stack.length > 0) {
      const currentId = stack.pop();
      if (!currentId || descendantIds.has(currentId)) {
        continue;
      }

      descendantIds.add(currentId);
      const children = childrenMap.get(currentId);
      if (children) {
        stack.push(...children);
      }
    }

    rows = rows.filter((row) => descendantIds.has(row.id));
  }

  if (query.tags.length > 0) {
    rows = rows.filter((row) => query.tags.some((tag) => row.tags.includes(tag)));
  }

  const total = rows.length;

  if (usePagination) {
    rows = rows.slice((page - 1) * pageSize, page * pageSize);
  }

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

export async function getItemStatsForHousehold(householdId: string) {
  const [totalsRow] = await getDb()
    .select({
      total: count(),
      containers: sql<number>`coalesce(sum(case when ${items.type} = 'container' then 1 else 0 end), 0)`,
      inventoryItems: sql<number>`coalesce(sum(case when ${items.type} = 'item' then 1 else 0 end), 0)`,
      borrowed: sql<number>`coalesce(sum(case when ${items.status} = 'borrowed' then 1 else 0 end), 0)`,
    })
    .from(items)
    .where(eq(items.householdId, householdId));

  return {
    total: Number(totalsRow?.total ?? 0),
    containers: Number(totalsRow?.containers ?? 0),
    items: Number(totalsRow?.inventoryItems ?? 0),
    borrowed: Number(totalsRow?.borrowed ?? 0),
  };
}

export async function exportInventoryForHousehold(householdId: string) {
  const [
    itemRows,
    categoryRows,
    tagRows,
    householdRows,
    codeRows,
    stocktakeRows,
    loanRows,
    reminderRows,
    attachmentRows,
    maintenanceRows,
    batchRows,
    activityRows,
  ] = await Promise.all([
    getDb()
      .select()
      .from(items)
      .where(eq(items.householdId, householdId))
      .orderBy(asc(items.name)),
    getDb()
      .select()
      .from(categories)
      .where(eq(categories.householdId, householdId))
      .orderBy(asc(categories.itemType), asc(categories.name)),
    getDb()
      .select()
      .from(tagRegistry)
      .where(eq(tagRegistry.householdId, householdId))
      .orderBy(asc(tagRegistry.name)),
    getDb().select().from(households).where(eq(households.id, householdId)).limit(1),
    getDb().select().from(inventoryCodes).where(eq(inventoryCodes.householdId, householdId)),
    getDb().select().from(stocktakes).where(eq(stocktakes.householdId, householdId)),
    getDb().select().from(loans).where(eq(loans.householdId, householdId)),
    getDb().select().from(reminders).where(eq(reminders.householdId, householdId)),
    getDb().select().from(attachments).where(eq(attachments.householdId, householdId)),
    getDb().select().from(maintenanceRecords).where(eq(maintenanceRecords.householdId, householdId)),
    getDb().select().from(inventoryBatches).where(eq(inventoryBatches.householdId, householdId)),
    getDb().select().from(activityLogs).where(eq(activityLogs.householdId, householdId)),
  ]);
  const stocktakeIds = stocktakeRows.map((row) => row.id);
  const stocktakeEntryRows = stocktakeIds.length > 0
    ? await getDb().select().from(stocktakeEntries).where(inArray(stocktakeEntries.stocktakeId, stocktakeIds))
    : [];

  return {
    items: itemRows,
    categories: categoryRows,
    tags: tagRows,
    household: householdRows[0] ?? null,
    codes: codeRows,
    stocktakes: stocktakeRows,
    stocktakeEntries: stocktakeEntryRows,
    loans: loanRows,
    reminders: reminderRows,
    attachments: attachmentRows,
    maintenanceRecords: maintenanceRows,
    inventoryBatches: batchRows,
    activity: activityRows,
  };
}

function parseImportedDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseImportedDateOnly(value: string | null) {
  if (!value) {
    return null;
  }

  return /^(\d{4}-\d{2}-\d{2})(?:$|T)/.exec(value)?.[1] ?? null;
}

function readString(record: Record<string, unknown>, key: string) {
  return typeof record[key] === 'string' ? record[key] : null;
}

function readNumber(record: Record<string, unknown>, key: string) {
  return typeof record[key] === 'number' && Number.isFinite(record[key]) ? record[key] : null;
}

function readEnum<const T extends readonly string[]>(record: Record<string, unknown>, key: string, values: T) {
  const value = readString(record, key);
  return value && values.includes(value) ? value as T[number] : null;
}

export async function importInventoryForHousehold(context: InventoryContext, snapshot: ImportInventoryInput) {
  const db = getDb();
  const snapshotItemMap = new Map(snapshot.items.map((item) => [item.id, item]));

  for (const item of snapshot.items) {
    if (!item.parent_id) {
      continue;
    }

    const parent = snapshotItemMap.get(item.parent_id);
    if (parent && parent.type !== 'container') {
      throw new Error('导入数据中的上级位置必须是收纳类型');
    }
  }

  return db.transaction(async (tx) => {
    const existingStocktakes = await tx.select({ id: stocktakes.id }).from(stocktakes)
      .where(eq(stocktakes.householdId, context.householdId));
    if (existingStocktakes.length > 0) {
      await tx.delete(stocktakeEntries).where(inArray(stocktakeEntries.stocktakeId, existingStocktakes.map((row) => row.id)));
    }
    await tx.delete(stocktakes).where(eq(stocktakes.householdId, context.householdId));
    await tx.delete(inventoryCodes).where(eq(inventoryCodes.householdId, context.householdId));
    await tx.delete(loans).where(eq(loans.householdId, context.householdId));
    await tx.delete(reminders).where(eq(reminders.householdId, context.householdId));
    await tx.delete(attachments).where(eq(attachments.householdId, context.householdId));
    await tx.delete(maintenanceRecords).where(eq(maintenanceRecords.householdId, context.householdId));
    await tx.delete(inventoryBatches).where(eq(inventoryBatches.householdId, context.householdId));
    await tx.delete(activityLogs).where(eq(activityLogs.householdId, context.householdId));
    await tx.delete(items).where(eq(items.householdId, context.householdId));
    await tx.delete(categories).where(eq(categories.householdId, context.householdId));
    await tx.delete(tagRegistry).where(eq(tagRegistry.householdId, context.householdId));

    const importedCategories = snapshot.categories.flatMap((category) => {
      if (category.scope) {
        return [{ ...category, resolvedScope: category.scope }];
      }
      if (category.item_type === 'item') {
        return [{ ...category, resolvedScope: 'item' as const }];
      }

      const matchingContainers = snapshot.items.filter(
        (item) => item.type === 'container' && item.category === category.name,
      );
      const usedByLocation = matchingContainers.some(
        (item) => item.metadata?.location_tag === true,
      );
      const usedByStorage = matchingContainers.some(
        (item) => item.metadata?.location_tag !== true,
      );

      if (usedByLocation && usedByStorage) {
        return [
          { ...category, resolvedScope: 'container' as const },
          { ...category, id: randomUUID(), preset_key: null, resolvedScope: 'location' as const },
        ];
      }

      return [{
        ...category,
        resolvedScope: usedByLocation ? 'location' as const : 'container' as const,
      }];
    });

    if (importedCategories.length > 0) {
      await tx.insert(categories).values(
        importedCategories.map((category) => ({
          id: randomUUID(),
          userId: context.userId,
          householdId: context.householdId,
          itemType: category.item_type,
          scope: category.resolvedScope,
          presetKey: category.preset_key ?? null,
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
          userId: context.userId,
          householdId: context.householdId,
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
          userId: context.userId,
          householdId: context.householdId,
          parentId: item.parent_id ? (itemIdMap.get(item.parent_id) ?? null) : null,
          type: item.type,
          name: item.name,
          description: item.description,
          category: item.category,
          price: normalizePrice(item.price),
          quantity: item.quantity,
          trackingMode: item.tracking_mode,
          minimumQuantity: item.minimum_quantity,
          expiryDate: item.expiry_date,
          purchaseDate: parseImportedDateOnly(item.purchase_date),
          warrantyDate: parseImportedDateOnly(item.warranty_date),
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

    if (snapshot.version === '4') {
      const mappedItemId = (sourceId: string | null) => sourceId ? itemIdMap.get(sourceId) ?? null : null;

      const importedCodes = snapshot.codes.flatMap((record) => {
        const code = readString(record, 'code');
        if (!code) return [];
        return [{
          householdId: context.householdId,
          itemId: mappedItemId(readString(record, 'itemId')),
          code,
          createdByUserId: context.userId,
          boundAt: parseImportedDate(readString(record, 'boundAt')),
          createdAt: parseImportedDate(readString(record, 'createdAt')) ?? new Date(),
        }];
      });
      if (importedCodes.length > 0) await tx.insert(inventoryCodes).values(importedCodes);

      const stocktakeIdMap = new Map<string, string>();
      for (const record of snapshot.stocktakes) {
        const sourceId = readString(record, 'id');
        const locationId = mappedItemId(readString(record, 'locationId'));
        const status = readEnum(record, 'status', ['in_progress', 'completed', 'cancelled'] as const);
        if (!sourceId || !locationId || !status) continue;
        const id = randomUUID();
        stocktakeIdMap.set(sourceId, id);
        await tx.insert(stocktakes).values({
          id,
          householdId: context.householdId,
          locationId,
          status,
          createdByUserId: context.userId,
          completedAt: parseImportedDate(readString(record, 'completedAt')),
          createdAt: parseImportedDate(readString(record, 'createdAt')) ?? new Date(),
          updatedAt: parseImportedDate(readString(record, 'updatedAt')) ?? new Date(),
        });
      }

      const importedEntries = snapshot.stocktake_entries.flatMap((record) => {
        const stocktakeId = stocktakeIdMap.get(readString(record, 'stocktakeId') ?? '');
        const itemId = mappedItemId(readString(record, 'itemId'));
        const status = readEnum(record, 'status', ['expected', 'found', 'missing', 'unexpected'] as const);
        if (!stocktakeId || !itemId || !status) return [];
        return [{
          stocktakeId,
          itemId,
          expectedParentId: mappedItemId(readString(record, 'expectedParentId')),
          foundParentId: mappedItemId(readString(record, 'foundParentId')),
          expectedQuantity: readNumber(record, 'expectedQuantity') ?? 1,
          countedQuantity: readNumber(record, 'countedQuantity'),
          status,
          updatedAt: parseImportedDate(readString(record, 'updatedAt')) ?? new Date(),
        }];
      });
      if (importedEntries.length > 0) await tx.insert(stocktakeEntries).values(importedEntries);

      const loanIdMap = new Map<string, string>();
      for (const record of snapshot.loans) {
        const sourceId = readString(record, 'id');
        const itemId = mappedItemId(readString(record, 'itemId'));
        const borrowerName = readString(record, 'borrowerName');
        if (!sourceId || !itemId || !borrowerName) continue;
        const id = randomUUID();
        loanIdMap.set(sourceId, id);
        await tx.insert(loans).values({
          id,
          householdId: context.householdId,
          itemId,
          borrowerName,
          checkedOutAt: parseImportedDate(readString(record, 'checkedOutAt')) ?? new Date(),
          dueAt: parseImportedDate(readString(record, 'dueAt')),
          returnedAt: parseImportedDate(readString(record, 'returnedAt')),
          notes: readString(record, 'notes') ?? '',
          createdByUserId: context.userId,
        });
      }

      const importedAttachments = snapshot.attachments.flatMap((record) => {
        const itemId = mappedItemId(readString(record, 'itemId'));
        const kind = readEnum(record, 'kind', ['receipt', 'manual', 'warranty', 'other'] as const);
        const name = readString(record, 'name');
        const fileUrl = readString(record, 'fileUrl');
        if (!itemId || !kind || !name || !fileUrl) return [];
        return [{
          householdId: context.householdId,
          itemId,
          kind,
          name,
          fileUrl,
          mimeType: readString(record, 'mimeType') ?? 'application/octet-stream',
          sizeBytes: readNumber(record, 'sizeBytes') ?? 0,
          createdByUserId: context.userId,
          createdAt: parseImportedDate(readString(record, 'createdAt')) ?? new Date(),
        }];
      });
      if (importedAttachments.length > 0) await tx.insert(attachments).values(importedAttachments);

      const importedMaintenance = snapshot.maintenance_records.flatMap((record) => {
        const itemId = mappedItemId(readString(record, 'itemId'));
        const title = readString(record, 'title');
        if (!itemId || !title) return [];
        return [{
          householdId: context.householdId,
          itemId,
          title,
          notes: readString(record, 'notes') ?? '',
          cost: readString(record, 'cost'),
          provider: readString(record, 'provider'),
          performedAt: parseImportedDate(readString(record, 'performedAt')) ?? new Date(),
          nextDueAt: parseImportedDate(readString(record, 'nextDueAt')),
          createdByUserId: context.userId,
          createdAt: parseImportedDate(readString(record, 'createdAt')) ?? new Date(),
        }];
      });
      if (importedMaintenance.length > 0) await tx.insert(maintenanceRecords).values(importedMaintenance);

      const importedBatches = snapshot.inventory_batches.flatMap((record) => {
        const itemId = mappedItemId(readString(record, 'itemId'));
        const quantity = readNumber(record, 'quantity');
        if (!itemId || quantity === null || quantity < 0) return [];
        return [{
          householdId: context.householdId,
          itemId,
          quantity,
          expiryDate: readString(record, 'expiryDate'),
          notes: readString(record, 'notes') ?? '',
          createdAt: parseImportedDate(readString(record, 'createdAt')) ?? new Date(),
          updatedAt: parseImportedDate(readString(record, 'updatedAt')) ?? new Date(),
        }];
      });
      if (importedBatches.length > 0) await tx.insert(inventoryBatches).values(importedBatches);

      const importedReminders = snapshot.reminders.flatMap((record) => {
        const type = readEnum(record, 'type', ['warranty', 'loan', 'maintenance', 'stocktake'] as const);
        const status = readEnum(record, 'status', ['unread', 'read', 'dismissed'] as const);
        const title = readString(record, 'title');
        const sourceKey = readString(record, 'sourceKey');
        const dueAt = parseImportedDate(readString(record, 'dueAt'));
        if (!type || !status || !title || !sourceKey || !dueAt) return [];
        return [{
          householdId: context.householdId,
          itemId: mappedItemId(readString(record, 'itemId')),
          loanId: loanIdMap.get(readString(record, 'loanId') ?? '') ?? null,
          type,
          status,
          sourceKey,
          title,
          description: readString(record, 'description') ?? '',
          dueAt,
          createdAt: parseImportedDate(readString(record, 'createdAt')) ?? new Date(),
          updatedAt: parseImportedDate(readString(record, 'updatedAt')) ?? new Date(),
        }];
      });
      if (importedReminders.length > 0) await tx.insert(reminders).values(importedReminders);
    }

    return {
      categories: importedCategories.length,
      tags: snapshot.tags.length,
      items: snapshot.items.length,
    };
  });
}

export async function findItemByIdForHousehold(householdId: string, itemId: string) {
  const [item] = await getDb()
    .select()
    .from(items)
    .where(and(
      eq(items.id, itemId),
      eq(items.householdId, householdId),
    ))
    .limit(1);

  return item ?? null;
}

export async function listAncestorsForHousehold(householdId: string, itemId: string) {
  const ancestors: Item[] = [];
  let currentId: string | null = itemId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const item = await findItemByIdForHousehold(householdId, currentId);
    if (!item) {
      break;
    }

    ancestors.unshift(item);
    currentId = item.parentId;
  }

  return ancestors;
}

export type ParentValidationResult = 'valid' | 'not_found' | 'not_container';

export async function validateParentForHousehold(householdId: string, parentId: string | null | undefined): Promise<ParentValidationResult> {
  if (!parentId) {
    return 'valid';
  }

  const [parent] = await getDb()
    .select({ id: items.id, type: items.type })
    .from(items)
    .where(and(
      eq(items.id, parentId),
      eq(items.householdId, householdId),
    ))
    .limit(1);

  if (!parent) {
    return 'not_found';
  }

  return parent.type === 'container' ? 'valid' : 'not_container';
}

export async function itemHasChildrenForHousehold(householdId: string, itemId: string) {
  const [row] = await getDb()
    .select({ value: count() })
    .from(items)
    .where(and(
      eq(items.householdId, householdId),
      eq(items.parentId, itemId),
    ));

  return Number(row?.value ?? 0) > 0;
}

export async function wouldCreateParentCycleForHousehold(householdId: string, itemId: string, parentId: string | null) {
  let currentId = parentId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    if (currentId === itemId) {
      return true;
    }

    visited.add(currentId);
    const parent = await findItemByIdForHousehold(householdId, currentId);
    currentId = parent?.parentId ?? null;
  }

  return false;
}

export async function createItemForHousehold(context: InventoryContext, input: CreateItemInput) {
  const normalizedInput = {
    ...input,
    tags: sanitizeTags(input.tags),
  };

  const [item] = await getDb()
    .insert(items)
    .values({
      userId: context.userId,
      householdId: context.householdId,
      ...toCreateValues(normalizedInput),
    })
    .returning();

  await ensureTagsForHousehold(context, normalizedInput.tags);
  return item ?? null;
}

export async function updateItemForHousehold(context: InventoryContext, itemId: string, input: UpdateItemInput) {
  const normalizedInput = input.tags !== undefined
    ? { ...input, tags: sanitizeTags(input.tags) }
    : input;

  const [item] = await getDb()
    .update(items)
    .set(toUpdateValues(normalizedInput))
    .where(and(
      eq(items.id, itemId),
      eq(items.householdId, context.householdId),
    ))
    .returning();

  if (normalizedInput.tags !== undefined) {
    await ensureTagsForHousehold(context, normalizedInput.tags);
  }
  return item ?? null;
}

export async function deleteItemForHousehold(householdId: string, itemId: string) {
  const [item] = await getDb()
    .delete(items)
    .where(and(
      eq(items.id, itemId),
      eq(items.householdId, householdId),
    ))
    .returning({ id: items.id });

  return item ?? null;
}

export async function mergeItemsForHousehold(input: {
  householdId: string;
  primaryItemId: string;
  duplicateItemIds: string[];
}) {
  return getDb().transaction(async (transaction) => {
    const sourceIds = [input.primaryItemId, ...input.duplicateItemIds];
    const sourceItems = await transaction.select().from(items).where(and(
      eq(items.householdId, input.householdId),
      inArray(items.id, sourceIds),
    ));
    const primary = sourceItems.find((item) => item.id === input.primaryItemId);
    if (!primary || primary.type !== 'item' || sourceItems.length !== sourceIds.length || sourceItems.some((item) => item.type !== 'item')) {
      return null;
    }
    const [stocktakeReference, loanReference] = await Promise.all([
      transaction.select({ id: stocktakeEntries.id }).from(stocktakeEntries)
        .where(inArray(stocktakeEntries.itemId, input.duplicateItemIds)).limit(1),
      transaction.select({ id: loans.id }).from(loans)
        .where(inArray(loans.itemId, input.duplicateItemIds)).limit(1),
    ]);
    if (stocktakeReference.length > 0 || loanReference.length > 0) {
      return null;
    }

    const [merged] = await transaction.update(items).set({
      quantity: sourceItems.reduce((sum, item) => sum + item.quantity, 0),
      tags: [...new Set(sourceItems.flatMap((item) => item.tags))],
      images: [...new Set(sourceItems.flatMap((item) => item.images))],
      description: primary.description || sourceItems.find((item) => item.description)?.description || '',
      price: primary.price ?? sourceItems.find((item) => item.price !== null)?.price ?? null,
      updatedAt: new Date(),
    }).where(and(
      eq(items.id, primary.id),
      eq(items.householdId, input.householdId),
    )).returning();

    await transaction.delete(items).where(and(
      eq(items.householdId, input.householdId),
      inArray(items.id, input.duplicateItemIds),
    ));
    return merged ?? null;
  });
}
