import {
  and,
  asc,
  desc,
  eq,
  isNull,
  lte,
} from 'drizzle-orm';
import {
  attachments,
  inventoryBatches,
  items,
  loans,
  maintenanceRecords,
  reminders,
  stocktakes,
} from '@inplace/db';
import { getDb } from '../../lib/db.js';
import type {
  CreateAttachmentInput,
  CreateInventoryBatchInput,
  CreateLoanInput,
  CreateMaintenanceInput,
} from './lifecycle.types.js';

function normalizeCost(value: number | null | undefined) {
  return value === null || value === undefined ? null : value.toFixed(2);
}

async function findHouseholdItem(householdId: string, itemId: string) {
  const [item] = await getDb().select().from(items).where(and(
    eq(items.id, itemId),
    eq(items.householdId, householdId),
  )).limit(1);
  return item ?? null;
}

export async function listLoans(householdId: string, activeOnly = false) {
  const filters = [eq(loans.householdId, householdId)];
  if (activeOnly) filters.push(isNull(loans.returnedAt));
  return getDb().select().from(loans).where(and(...filters)).orderBy(desc(loans.checkedOutAt));
}

export async function createLoan(input: CreateLoanInput) {
  return getDb().transaction(async (transaction) => {
    const [item] = await transaction.select().from(items).where(and(
      eq(items.id, input.itemId),
      eq(items.householdId, input.householdId),
    )).limit(1);
    if (!item || item.type !== 'item') return { status: 'item_not_found' as const };

    const [activeLoan] = await transaction.select({ id: loans.id }).from(loans).where(and(
      eq(loans.itemId, item.id),
      isNull(loans.returnedAt),
    )).limit(1);
    if (activeLoan) return { status: 'already_borrowed' as const };

    const [loan] = await transaction.insert(loans).values({
      householdId: input.householdId,
      itemId: item.id,
      borrowerUserId: input.borrowerUserId,
      borrowerName: input.borrowerName,
      dueAt: input.dueAt,
      notes: input.notes,
      createdByUserId: input.userId,
    }).returning();
    await transaction.update(items).set({
      status: 'borrowed',
      updatedAt: new Date(),
    }).where(eq(items.id, item.id));
    return { status: 'created' as const, data: loan, item };
  });
}

export async function returnLoan(input: {
  householdId: string;
  loanId: string;
}) {
  return getDb().transaction(async (transaction) => {
    const [loan] = await transaction.select().from(loans).where(and(
      eq(loans.id, input.loanId),
      eq(loans.householdId, input.householdId),
      isNull(loans.returnedAt),
    )).limit(1);
    if (!loan) return null;
    const returnedAt = new Date();
    const [returned] = await transaction.update(loans).set({ returnedAt })
      .where(eq(loans.id, loan.id)).returning();
    await transaction.update(items).set({
      status: 'in_stock',
      updatedAt: returnedAt,
    }).where(eq(items.id, loan.itemId));
    return returned ?? null;
  });
}

export async function listAttachments(householdId: string, itemId: string) {
  return getDb().select().from(attachments).where(and(
    eq(attachments.householdId, householdId),
    eq(attachments.itemId, itemId),
  )).orderBy(desc(attachments.createdAt));
}

export async function createAttachment(input: CreateAttachmentInput) {
  if (!await findHouseholdItem(input.householdId, input.itemId)) {
    return null;
  }
  const [attachment] = await getDb().insert(attachments).values({
    householdId: input.householdId,
    itemId: input.itemId,
    kind: input.kind,
    name: input.name,
    fileUrl: input.fileUrl,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    createdByUserId: input.userId,
  }).returning();
  return attachment ?? null;
}

export async function deleteAttachment(householdId: string, attachmentId: string) {
  const [attachment] = await getDb().delete(attachments).where(and(
    eq(attachments.id, attachmentId),
    eq(attachments.householdId, householdId),
  )).returning();
  return attachment ?? null;
}

export async function listMaintenanceRecords(householdId: string, itemId: string) {
  return getDb().select().from(maintenanceRecords).where(and(
    eq(maintenanceRecords.householdId, householdId),
    eq(maintenanceRecords.itemId, itemId),
  )).orderBy(desc(maintenanceRecords.performedAt));
}

export async function createMaintenanceRecord(input: CreateMaintenanceInput) {
  if (!await findHouseholdItem(input.householdId, input.itemId)) {
    return null;
  }
  const [record] = await getDb().insert(maintenanceRecords).values({
    householdId: input.householdId,
    itemId: input.itemId,
    title: input.title,
    notes: input.notes,
    cost: normalizeCost(input.cost),
    provider: input.provider,
    performedAt: input.performedAt,
    nextDueAt: input.nextDueAt,
    createdByUserId: input.userId,
  }).returning();
  return record ?? null;
}

export async function listInventoryBatches(householdId: string, itemId: string) {
  return getDb().select().from(inventoryBatches).where(and(
    eq(inventoryBatches.householdId, householdId),
    eq(inventoryBatches.itemId, itemId),
  )).orderBy(asc(inventoryBatches.expiryDate));
}

export async function createInventoryBatch(input: CreateInventoryBatchInput) {
  return getDb().transaction(async (transaction) => {
    const [item] = await transaction.select({ id: items.id }).from(items).where(and(
      eq(items.id, input.itemId),
      eq(items.householdId, input.householdId),
    )).limit(1);
    if (!item) return null;

    const [batch] = await transaction.insert(inventoryBatches).values({
      householdId: input.householdId,
      itemId: input.itemId,
      quantity: input.quantity,
      expiryDate: input.expiryDate,
      notes: input.notes,
    }).returning();
    if (!batch) return null;

    const batches = await transaction.select().from(inventoryBatches).where(and(
      eq(inventoryBatches.householdId, input.householdId),
      eq(inventoryBatches.itemId, input.itemId),
    ));
    const totalQuantity = batches.reduce((sum, current) => sum + current.quantity, 0);
    await transaction.update(items).set({
      quantity: totalQuantity,
      trackingMode: 'consumable',
      updatedAt: new Date(),
    }).where(and(
      eq(items.id, input.itemId),
      eq(items.householdId, input.householdId),
    ));
    return batch;
  });
}

export async function deleteInventoryBatch(householdId: string, batchId: string) {
  return getDb().transaction(async (transaction) => {
    const [deleted] = await transaction.delete(inventoryBatches).where(and(
      eq(inventoryBatches.id, batchId),
      eq(inventoryBatches.householdId, householdId),
    )).returning();
    if (!deleted) return null;
    const batches = await transaction.select().from(inventoryBatches).where(and(
      eq(inventoryBatches.householdId, householdId),
      eq(inventoryBatches.itemId, deleted.itemId),
    ));
    const totalQuantity = batches.reduce((sum, current) => sum + current.quantity, 0);
    await transaction.update(items).set({
      quantity: Math.max(0, totalQuantity),
      updatedAt: new Date(),
    }).where(eq(items.id, deleted.itemId));
    return deleted;
  });
}

export async function refreshDerivedReminders(householdId: string) {
  const [householdItems, activeLoans, maintenance, householdStocktakes] = await Promise.all([
    getDb().select().from(items).where(eq(items.householdId, householdId)),
    getDb().select().from(loans).where(and(
      eq(loans.householdId, householdId),
      isNull(loans.returnedAt),
    )),
    getDb().select().from(maintenanceRecords).where(and(
      eq(maintenanceRecords.householdId, householdId),
    )),
    getDb().select().from(stocktakes).where(eq(stocktakes.householdId, householdId)),
  ]);
  const latestStocktakeByLocation = new Map<string, Date>();
  householdStocktakes.forEach((stocktake) => {
    const previous = latestStocktakeByLocation.get(stocktake.locationId);
    if (!previous || stocktake.createdAt > previous) latestStocktakeByLocation.set(stocktake.locationId, stocktake.createdAt);
  });
  const stocktakeReminderThreshold = new Date();
  stocktakeReminderThreshold.setDate(stocktakeReminderThreshold.getDate() - 90);

  const derived = [
    ...householdItems.flatMap((item) => item.warrantyDate ? [{
      itemId: item.id,
      loanId: null,
      type: 'warranty' as const,
      sourceKey: `warranty:${item.id}:${item.warrantyDate.toISOString()}`,
      title: `${item.name} 保修即将到期`,
      description: '请检查保修凭证或安排售后。',
      dueAt: item.warrantyDate,
    }] : []),
    ...activeLoans.flatMap((loan) => loan.dueAt ? [{
      itemId: loan.itemId,
      loanId: loan.id,
      type: 'loan' as const,
      sourceKey: `loan:${loan.id}:${loan.dueAt.toISOString()}`,
      title: `${loan.borrowerName} 的借用即将到期`,
      description: '确认物品是否需要归还或续借。',
      dueAt: loan.dueAt,
    }] : []),
    ...maintenance.flatMap((record) => record.nextDueAt ? [{
      itemId: record.itemId,
      loanId: null,
      type: 'maintenance' as const,
      sourceKey: `maintenance:${record.id}:${record.nextDueAt.toISOString()}`,
      title: `${record.title} 到期`,
      description: record.notes,
      dueAt: record.nextDueAt,
    }] : []),
    ...householdItems.flatMap((item) => {
      if (item.type !== 'container' || item.metadata?.location_tag !== true) return [];
      const latest = latestStocktakeByLocation.get(item.id);
      if (latest && latest >= stocktakeReminderThreshold) return [];
      return [{
        itemId: item.id,
        loanId: null,
        type: 'stocktake' as const,
        sourceKey: `stocktake:${item.id}`,
        title: `${item.name} 久未盘点`,
        description: latest ? '距上次盘点已超过 90 天。' : '这个位置还没有完成过盘点。',
        dueAt: latest ?? item.createdAt,
      }];
    }),
  ];

  for (const reminder of derived) {
    await getDb().insert(reminders).values({
      householdId,
      ...reminder,
    }).onConflictDoUpdate({
      target: [reminders.householdId, reminders.sourceKey],
      set: {
        title: reminder.title,
        description: reminder.description,
        dueAt: reminder.dueAt,
        updatedAt: new Date(),
      },
    });
  }
}

export async function listReminders(householdId: string, dueBefore?: Date) {
  await refreshDerivedReminders(householdId);
  const filters = [eq(reminders.householdId, householdId)];
  if (dueBefore) filters.push(lte(reminders.dueAt, dueBefore));
  return getDb().select().from(reminders).where(and(...filters)).orderBy(asc(reminders.dueAt));
}

export async function updateReminderStatus(input: {
  householdId: string;
  reminderId: string;
  status: 'unread' | 'read' | 'dismissed';
}) {
  const [reminder] = await getDb().update(reminders).set({
    status: input.status,
    updatedAt: new Date(),
  }).where(and(
    eq(reminders.id, input.reminderId),
    eq(reminders.householdId, input.householdId),
  )).returning();
  return reminder ?? null;
}
