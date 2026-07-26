import type { FastifyPluginAsync } from 'fastify';
import { requireHouseholdAccess } from '../../lib/household-access.js';
import { createActivityLogForHousehold } from '../activity/activity.repository.js';
import {
  completeStocktake,
  createStocktake,
  getStocktake,
  listRecentStocktakes,
  updateStocktakeEntry,
} from './stocktake.repository.js';
import {
  completeStocktakeSchema,
  createStocktakeSchema,
  stocktakeIdParamsSchema,
  updateStocktakeEntrySchema,
} from './stocktake.schemas.js';

export const stocktakeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) return;
    return reply.send({ data: await listRecentStocktakes(access.householdId) });
  });

  app.post('/', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) return;
    const body = createStocktakeSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: body.error.issues[0]?.message });
    }
    const session = await createStocktake({
      householdId: access.householdId,
      userId: access.userId,
      locationId: body.data.locationId,
    });
    if (!session) {
      return reply.code(404).send({ error: 'LOCATION_NOT_FOUND', message: '盘点位置不存在' });
    }
    const stocktake = await getStocktake(access.householdId, session.id);
    await createActivityLogForHousehold({
      userId: access.userId,
      householdId: access.householdId,
      itemId: session.locationId,
      itemType: 'container',
      itemName: stocktake?.location?.name ?? '盘点位置',
      action: 'stocktake_start',
      metadata: { stocktake_id: session.id },
    });
    return reply.code(201).send({ data: stocktake });
  });

  app.get('/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) return;
    const params = stocktakeIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: '盘点参数不合法' });
    }
    const session = await getStocktake(access.householdId, params.data.id);
    if (!session) {
      return reply.code(404).send({ error: 'STOCKTAKE_NOT_FOUND', message: '盘点不存在' });
    }
    return reply.send({ data: session });
  });

  app.patch('/:id/entries', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) return;
    const params = stocktakeIdParamsSchema.safeParse(request.params);
    const body = updateStocktakeEntrySchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: '盘点记录参数不合法' });
    }
    const entry = await updateStocktakeEntry({
      householdId: access.householdId,
      stocktakeId: params.data.id,
      ...body.data,
    });
    if (!entry) {
      return reply.code(404).send({ error: 'STOCKTAKE_ENTRY_NOT_FOUND', message: '盘点或物品不存在' });
    }
    return reply.send({ data: entry });
  });

  app.post('/:id/complete', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) return;
    const params = stocktakeIdParamsSchema.safeParse(request.params);
    const body = completeStocktakeSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: '完成盘点参数不合法' });
    }
    const session = await completeStocktake({
      householdId: access.householdId,
      stocktakeId: params.data.id,
      ...body.data,
    });
    if (!session) {
      return reply.code(404).send({ error: 'STOCKTAKE_NOT_FOUND', message: '盘点不存在或已完成' });
    }
    const stocktake = await getStocktake(access.householdId, session.id);
    await createActivityLogForHousehold({
      userId: access.userId,
      householdId: access.householdId,
      itemId: session.locationId,
      itemType: 'container',
      itemName: stocktake?.location?.name ?? '盘点位置',
      action: 'stocktake_complete',
      metadata: {
        stocktake_id: session.id,
        reconcile_moves: body.data.reconcileMoves,
        reconcile_quantities: body.data.reconcileQuantities,
      },
    });
    return reply.send({ data: stocktake });
  });
};
