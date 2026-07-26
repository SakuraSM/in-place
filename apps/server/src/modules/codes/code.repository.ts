import { randomBytes } from 'node:crypto';
import { inventoryCodes, items } from '@inplace/db';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../../lib/db.js';

const CODE_BYTES = 18;

function createOpaqueCode() {
  return randomBytes(CODE_BYTES).toString('base64url');
}

export async function createInventoryCodeBatch(input: {
  householdId: string;
  userId: string;
  count: number;
}) {
  const created = [];
  for (let index = 0; index < input.count; index += 1) {
    let inserted = false;
    for (let attempt = 0; attempt < 5 && !inserted; attempt += 1) {
      try {
        const [record] = await getDb().insert(inventoryCodes).values({
          householdId: input.householdId,
          createdByUserId: input.userId,
          code: createOpaqueCode(),
        }).returning();
        if (record) created.push(record);
        inserted = true;
      } catch (error) {
        const isCollision = typeof error === 'object'
          && error !== null
          && 'code' in error
          && error.code === '23505';
        if (!isCollision || attempt === 4) throw error;
      }
    }
  }
  return created;
}

export async function findInventoryCode(code: string) {
  const [record] = await getDb()
    .select()
    .from(inventoryCodes)
    .where(eq(inventoryCodes.code, code))
    .limit(1);

  return record ?? null;
}

export async function resolveInventoryCode(code: string) {
  const [record] = await getDb()
    .select({
      id: inventoryCodes.id,
      householdId: inventoryCodes.householdId,
      itemId: inventoryCodes.itemId,
      code: inventoryCodes.code,
      createdByUserId: inventoryCodes.createdByUserId,
      boundAt: inventoryCodes.boundAt,
      createdAt: inventoryCodes.createdAt,
      item: items,
    })
    .from(inventoryCodes)
    .leftJoin(items, eq(inventoryCodes.itemId, items.id))
    .where(eq(inventoryCodes.code, code))
    .limit(1);

  return record ?? null;
}

export async function bindInventoryCode(input: {
  householdId: string;
  code: string;
  itemId: string;
}) {
  return getDb().transaction(async (transaction) => {
    const [item] = await transaction.select({ id: items.id })
      .from(items)
      .where(and(
        eq(items.id, input.itemId),
        eq(items.householdId, input.householdId),
      ))
      .limit(1);

    if (!item) {
      return { status: 'item_not_found' as const };
    }

    const [codeRecord] = await transaction.select()
      .from(inventoryCodes)
      .where(and(
        eq(inventoryCodes.code, input.code),
        eq(inventoryCodes.householdId, input.householdId),
      ))
      .limit(1);

    if (!codeRecord) {
      return { status: 'code_not_found' as const };
    }

    if (codeRecord.itemId && codeRecord.itemId !== input.itemId) {
      return { status: 'already_bound' as const };
    }

    await transaction.update(inventoryCodes)
      .set({ itemId: null, boundAt: null })
      .where(eq(inventoryCodes.itemId, input.itemId));

    const [updated] = await transaction.update(inventoryCodes)
      .set({ itemId: input.itemId, boundAt: new Date() })
      .where(eq(inventoryCodes.id, codeRecord.id))
      .returning();

    return { status: 'bound' as const, data: updated };
  });
}
