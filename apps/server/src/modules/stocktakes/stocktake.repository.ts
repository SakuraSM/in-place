import { and, asc, eq, inArray } from 'drizzle-orm';
import { items, stocktakeEntries, stocktakes } from '@inplace/db';
import { getDb } from '../../lib/db.js';

export function collectDescendantIds(locationId: string, rows: Array<{ id: string; parentId: string | null }>) {
  const childrenByParent = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const children = childrenByParent.get(row.parentId) ?? [];
    children.push(row.id);
    childrenByParent.set(row.parentId, children);
  }

  const descendantIds: string[] = [];
  const visited = new Set<string>([locationId]);
  const pendingIds = [...(childrenByParent.get(locationId) ?? [])];
  while (pendingIds.length > 0) {
    const currentId = pendingIds.pop();
    if (!currentId || visited.has(currentId)) continue;
    visited.add(currentId);
    descendantIds.push(currentId);
    pendingIds.push(...(childrenByParent.get(currentId) ?? []));
  }
  return descendantIds;
}

export async function createStocktake(input: {
  householdId: string;
  userId: string;
  locationId: string;
}) {
  return getDb().transaction(async (transaction) => {
    const [location] = await transaction.select().from(items).where(and(
      eq(items.id, input.locationId),
      eq(items.householdId, input.householdId),
      eq(items.type, 'container'),
    )).limit(1);
    if (!location) return null;

    const inventoryRows = await transaction.select().from(items)
      .where(eq(items.householdId, input.householdId));
    const descendantIds = new Set(collectDescendantIds(input.locationId, inventoryRows));
    const [session] = await transaction.insert(stocktakes).values({
      householdId: input.householdId,
      locationId: input.locationId,
      createdByUserId: input.userId,
    }).returning();
    if (!session) throw new Error('创建盘点失败');

    const expectedItems = inventoryRows.filter((item) => descendantIds.has(item.id));
    if (expectedItems.length > 0) {
      await transaction.insert(stocktakeEntries).values(expectedItems.map((item) => ({
        stocktakeId: session.id,
        itemId: item.id,
        expectedParentId: item.parentId,
        expectedQuantity: item.quantity,
        status: 'expected' as const,
      })));
    }
    return session;
  });
}

export async function getStocktake(householdId: string, stocktakeId: string) {
  const [session] = await getDb().select().from(stocktakes).where(and(
    eq(stocktakes.id, stocktakeId),
    eq(stocktakes.householdId, householdId),
  )).limit(1);
  if (!session) return null;

  const [location, entries] = await Promise.all([
    getDb().select().from(items).where(eq(items.id, session.locationId)).limit(1),
    getDb().select({
      entry: stocktakeEntries,
      item: items,
    })
      .from(stocktakeEntries)
      .innerJoin(items, eq(stocktakeEntries.itemId, items.id))
      .where(eq(stocktakeEntries.stocktakeId, session.id))
      .orderBy(asc(items.name)),
  ]);

  return {
    ...session,
    location: location[0] ?? null,
    entries: entries.map(({ entry, item }) => ({ ...entry, item })),
  };
}

export async function updateStocktakeEntry(input: {
  householdId: string;
  stocktakeId: string;
  itemId: string;
  countedQuantity: number;
  foundParentId?: string | null;
}) {
  return getDb().transaction(async (transaction) => {
    const [session] = await transaction.select().from(stocktakes).where(and(
      eq(stocktakes.id, input.stocktakeId),
      eq(stocktakes.householdId, input.householdId),
      eq(stocktakes.status, 'in_progress'),
    )).limit(1);
    if (!session) return null;

    const [item] = await transaction.select().from(items).where(and(
      eq(items.id, input.itemId),
      eq(items.householdId, input.householdId),
    )).limit(1);
    if (!item) return null;

    const [existing] = await transaction.select().from(stocktakeEntries).where(and(
      eq(stocktakeEntries.stocktakeId, session.id),
      eq(stocktakeEntries.itemId, item.id),
    )).limit(1);

    const foundParentId = input.foundParentId === undefined ? item.parentId : input.foundParentId;
    if (foundParentId) {
      const [foundParent] = await transaction.select({ id: items.id }).from(items).where(and(
        eq(items.id, foundParentId),
        eq(items.householdId, input.householdId),
        eq(items.type, 'container'),
      )).limit(1);
      if (!foundParent || foundParentId === item.id) return null;

      const hierarchy = await transaction.select({
        id: items.id,
        parentId: items.parentId,
      }).from(items).where(eq(items.householdId, input.householdId));
      const descendantIds = new Set(collectDescendantIds(item.id, hierarchy));
      if (descendantIds.has(foundParentId)) return null;
    }
    const status = existing ? 'found' as const : 'unexpected' as const;
    if (existing) {
      const [updated] = await transaction.update(stocktakeEntries).set({
        countedQuantity: input.countedQuantity,
        foundParentId,
        status,
        updatedAt: new Date(),
      }).where(eq(stocktakeEntries.id, existing.id)).returning();
      return updated ?? null;
    }

    const [created] = await transaction.insert(stocktakeEntries).values({
      stocktakeId: session.id,
      itemId: item.id,
      expectedParentId: null,
      expectedQuantity: 0,
      countedQuantity: input.countedQuantity,
      foundParentId,
      status,
    }).returning();
    return created ?? null;
  });
}

export async function completeStocktake(input: {
  householdId: string;
  stocktakeId: string;
  reconcileMoves: boolean;
  reconcileQuantities: boolean;
}) {
  return getDb().transaction(async (transaction) => {
    const [session] = await transaction.select().from(stocktakes).where(and(
      eq(stocktakes.id, input.stocktakeId),
      eq(stocktakes.householdId, input.householdId),
      eq(stocktakes.status, 'in_progress'),
    )).limit(1);
    if (!session) return null;

    await transaction.update(stocktakeEntries).set({
      status: 'missing',
      countedQuantity: 0,
      updatedAt: new Date(),
    }).where(and(
      eq(stocktakeEntries.stocktakeId, session.id),
      eq(stocktakeEntries.status, 'expected'),
    ));

    const entries = await transaction.select().from(stocktakeEntries)
      .where(eq(stocktakeEntries.stocktakeId, session.id));
    for (const entry of entries) {
      const updates: { parentId?: string | null; quantity?: number; updatedAt: Date } = {
        updatedAt: new Date(),
      };
      if (input.reconcileMoves && entry.foundParentId !== null && entry.status !== 'missing') {
        updates.parentId = entry.foundParentId;
      }
      if (input.reconcileQuantities && entry.countedQuantity !== null && entry.status !== 'missing') {
        updates.quantity = Math.max(0, entry.countedQuantity);
      }
      if (Object.keys(updates).length > 1) {
        await transaction.update(items).set(updates).where(and(
          eq(items.id, entry.itemId),
          eq(items.householdId, input.householdId),
        ));
      }
    }

    const [completed] = await transaction.update(stocktakes).set({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(stocktakes.id, session.id)).returning();
    return completed ?? null;
  });
}

export async function listRecentStocktakes(householdId: string) {
  const sessions = await getDb().select().from(stocktakes)
    .where(eq(stocktakes.householdId, householdId))
    .orderBy(asc(stocktakes.createdAt))
    .limit(20);
  if (sessions.length === 0) return [];
  const locationIds = [...new Set(sessions.map((session) => session.locationId))];
  const locations = await getDb().select().from(items).where(inArray(items.id, locationIds));
  const locationsById = new Map(locations.map((location) => [location.id, location]));
  return sessions.map((session) => ({
    ...session,
    location: locationsById.get(session.locationId) ?? null,
  })).reverse();
}
