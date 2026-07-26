import type { FastifyPluginAsync } from 'fastify';
import { requireCurrentUser } from '../../lib/authenticated-request.js';
import { requireHouseholdAccess } from '../../lib/household-access.js';
import { createActivityLogForHousehold } from '../activity/activity.repository.js';
import { findHouseholdAccess } from '../households/household.repository.js';
import {
  bindInventoryCode,
  createInventoryCodeBatch,
  resolveInventoryCode,
} from './code.repository.js';
import {
  bindCodeSchema,
  codeParamsSchema,
  createCodeBatchSchema,
} from './code.schemas.js';

export const codeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/:code', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) return;
    const params = codeParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: 'INVALID_CODE', message: '二维码内容不合法' });
    }

    const record = await resolveInventoryCode(params.data.code);
    if (!record) {
      return reply.code(404).send({ error: 'CODE_NOT_FOUND', message: '二维码不存在' });
    }

    const access = await findHouseholdAccess({
      userId: currentUser.id,
      householdId: record.householdId,
    });
    if (!access) {
      return reply.code(403).send({ error: 'HOUSEHOLD_ACCESS_DENIED', message: '无权查看该二维码' });
    }

    return reply.send({
      data: {
        ...record,
        accessRole: access.role,
        entityKind: record.item
          ? record.item.type === 'container' && record.item.metadata?.location_tag === true
            ? 'location'
            : record.item.type
          : null,
      },
    });
  });

  app.post('/batches', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) return;
    const body = createCodeBatchSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: body.error.issues[0]?.message });
    }
    const records = await createInventoryCodeBatch({
      householdId: access.householdId,
      userId: access.userId,
      count: body.data.count,
    });
    return reply.code(201).send({ data: records });
  });

  app.post('/:code/bind', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) return;
    const params = codeParamsSchema.safeParse(request.params);
    const body = bindCodeSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: '绑定参数不合法' });
    }

    const result = await bindInventoryCode({
      householdId: access.householdId,
      code: params.data.code,
      itemId: body.data.itemId,
    });
    if (result.status === 'item_not_found') {
      return reply.code(404).send({ error: 'ITEM_NOT_FOUND', message: '绑定目标不存在' });
    }
    if (result.status === 'code_not_found') {
      return reply.code(404).send({ error: 'CODE_NOT_FOUND', message: '二维码不存在' });
    }
    if (result.status === 'already_bound') {
      return reply.code(409).send({ error: 'CODE_ALREADY_BOUND', message: '二维码已绑定其他对象' });
    }

    const resolved = await resolveInventoryCode(params.data.code);
    if (resolved?.item) {
      await createActivityLogForHousehold({
        userId: access.userId,
        householdId: access.householdId,
        itemId: resolved.item.id,
        itemType: resolved.item.type,
        itemName: resolved.item.name,
        action: 'code_bind',
        metadata: { code_id: result.data?.id },
      });
    }
    return reply.send({ data: result.data });
  });
};
