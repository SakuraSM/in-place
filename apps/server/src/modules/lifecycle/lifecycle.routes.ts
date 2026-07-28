import type { FastifyPluginAsync } from 'fastify';
import { getPublicOrigin, type AppEnv } from '../../env.js';
import { requireHouseholdAccess } from '../../lib/household-access.js';
import { isUploadReferenceAllowed } from '../../lib/upload-access.js';
import { createActivityLogForHousehold } from '../activity/activity.repository.js';
import {
  createAttachment,
  createInventoryBatch,
  createLoan,
  createMaintenanceRecord,
  deleteAttachment,
  deleteInventoryBatch,
  listAttachments,
  listInventoryBatches,
  listLoans,
  listMaintenanceRecords,
  listReminders,
  returnLoan,
  updateReminderStatus,
} from './lifecycle.repository.js';
import {
  createAttachmentSchema,
  createInventoryBatchSchema,
  createLoanSchema,
  createMaintenanceSchema,
  entityIdParamsSchema,
  itemLifecycleParamsSchema,
  updateReminderSchema,
} from './lifecycle.schemas.js';

export const lifecycleRoutes: FastifyPluginAsync<{ env: AppEnv }> = async (app, options) => {
  app.get('/loans', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) return;
    const activeOnly = (request.query as { active?: string }).active === 'true';
    return reply.send({ data: await listLoans(access.householdId, activeOnly) });
  });

  app.post('/loans', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) return;
    const body = createLoanSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: body.error.issues[0]?.message });
    }
    const result = await createLoan({ ...access, ...body.data });
    if (result.status === 'item_not_found') {
      return reply.code(404).send({ error: 'ITEM_NOT_FOUND', message: '借用物品不存在' });
    }
    if (result.status === 'already_borrowed') {
      return reply.code(409).send({ error: 'ITEM_ALREADY_BORROWED', message: '物品已借出，不能重复借用' });
    }
    if (!result.data || !result.item) {
      return reply.code(500).send({ error: 'LOAN_CREATE_FAILED', message: '创建借用记录失败' });
    }
    await createActivityLogForHousehold({
      userId: access.userId,
      householdId: access.householdId,
      itemId: result.item.id,
      itemType: result.item.type,
      itemName: result.item.name,
      action: 'loan_checkout',
      metadata: { loan_id: result.data.id, borrower_name: result.data.borrowerName },
    });
    return reply.code(201).send({ data: result.data });
  });

  app.post('/loans/:id/return', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) return;
    const params = entityIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: '借用记录参数不合法' });
    }
    const loan = await returnLoan({ householdId: access.householdId, loanId: params.data.id });
    if (!loan) {
      return reply.code(404).send({ error: 'LOAN_NOT_FOUND', message: '借用记录不存在或已归还' });
    }
    await createActivityLogForHousehold({
      userId: access.userId,
      householdId: access.householdId,
      itemId: loan.itemId,
      itemType: 'item',
      itemName: loan.borrowerName,
      action: 'loan_return',
      metadata: { loan_id: loan.id },
    });
    return reply.send({ data: loan });
  });

  app.get('/reminders', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) return;
    return reply.send({ data: await listReminders(access.householdId) });
  });

  app.patch('/reminders/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) return;
    const params = entityIdParamsSchema.safeParse(request.params);
    const body = updateReminderSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: '提醒参数不合法' });
    }
    const reminder = await updateReminderStatus({
      householdId: access.householdId,
      reminderId: params.data.id,
      status: body.data.status,
    });
    if (!reminder) {
      return reply.code(404).send({ error: 'REMINDER_NOT_FOUND', message: '提醒不存在' });
    }
    return reply.send({ data: reminder });
  });

  app.get('/items/:itemId/attachments', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) return;
    const params = itemLifecycleParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'INVALID_REQUEST', message: '物品参数不合法' });
    return reply.send({ data: await listAttachments(access.householdId, params.data.itemId) });
  });

  app.post('/items/:itemId/attachments', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) return;
    const params = itemLifecycleParamsSchema.safeParse(request.params);
    const body = createAttachmentSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: '附件参数不合法' });
    }
    if (!isUploadReferenceAllowed({
      value: body.data.fileUrl,
      householdId: access.householdId,
      userId: access.userId,
      publicOrigin: getPublicOrigin(options.env),
    })) {
      return reply.code(400).send({ error: 'INVALID_FILE_URL', message: '附件不属于当前家庭或不是安全的 HTTPS 地址' });
    }
    return reply.code(201).send({
      data: await createAttachment({ ...access, itemId: params.data.itemId, ...body.data }),
    });
  });

  app.delete('/attachments/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) return;
    const params = entityIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'INVALID_REQUEST', message: '附件参数不合法' });
    const attachment = await deleteAttachment(access.householdId, params.data.id);
    if (!attachment) return reply.code(404).send({ error: 'ATTACHMENT_NOT_FOUND', message: '附件不存在' });
    return reply.code(204).send();
  });

  app.get('/items/:itemId/maintenance', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) return;
    const params = itemLifecycleParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'INVALID_REQUEST', message: '物品参数不合法' });
    return reply.send({ data: await listMaintenanceRecords(access.householdId, params.data.itemId) });
  });

  app.post('/items/:itemId/maintenance', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) return;
    const params = itemLifecycleParamsSchema.safeParse(request.params);
    const body = createMaintenanceSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: '维护记录参数不合法' });
    }
    return reply.code(201).send({
      data: await createMaintenanceRecord({ ...access, itemId: params.data.itemId, ...body.data }),
    });
  });

  app.get('/items/:itemId/batches', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) return;
    const params = itemLifecycleParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'INVALID_REQUEST', message: '物品参数不合法' });
    return reply.send({ data: await listInventoryBatches(access.householdId, params.data.itemId) });
  });

  app.post('/items/:itemId/batches', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) return;
    const params = itemLifecycleParamsSchema.safeParse(request.params);
    const body = createInventoryBatchSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: '批次参数不合法' });
    }
    return reply.code(201).send({
      data: await createInventoryBatch({
        householdId: access.householdId,
        itemId: params.data.itemId,
        ...body.data,
      }),
    });
  });

  app.delete('/batches/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) return;
    const params = entityIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'INVALID_REQUEST', message: '批次参数不合法' });
    const batch = await deleteInventoryBatch(access.householdId, params.data.id);
    if (!batch) return reply.code(404).send({ error: 'BATCH_NOT_FOUND', message: '批次不存在' });
    return reply.code(204).send();
  });
};
