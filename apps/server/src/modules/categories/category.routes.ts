import type { FastifyPluginAsync } from 'fastify';
import { requireHouseholdAccess } from '../../lib/household-access.js';
import {
  categoryIdParamsSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from './category.schemas.js';
import {
  createCategoryForHousehold,
  deleteCategoryForHousehold,
  applyCategoryPresetsForHousehold,
  getCategoryPresetSummary,
  listCategoriesForHousehold,
  updateCategoryForHousehold,
} from './category.repository.js';

export const categoryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/presets', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) return;
    return reply.send(await getCategoryPresetSummary(access.householdId));
  });

  app.post('/presets/apply', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) return;
    return reply.send(await applyCategoryPresetsForHousehold(access));
  });

  app.get('/', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) {
      return;
    }

    const parsed = listCategoriesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_QUERY',
        message: parsed.error.issues[0]?.message ?? '查询参数不合法',
      });
    }

    return reply.send({
      data: await listCategoriesForHousehold(access.householdId, parsed.data),
    });
  });

  app.post('/', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) {
      return;
    }

    const parsed = createCategorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? '请求参数不合法',
      });
    }

    return reply.code(201).send({
      data: await createCategoryForHousehold(access, parsed.data),
    });
  });

  app.patch('/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) {
      return;
    }

    const params = categoryIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        error: 'INVALID_PARAMS',
        message: params.error.issues[0]?.message ?? '路径参数不合法',
      });
    }

    const parsed = updateCategorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? '请求参数不合法',
      });
    }

    const updatedCategory = await updateCategoryForHousehold(access.householdId, params.data.id, parsed.data);
    if (!updatedCategory) {
      return reply.code(404).send({
        error: 'CATEGORY_NOT_FOUND',
        message: '分类不存在',
      });
    }

    return reply.send({
      data: updatedCategory,
    });
  });

  app.delete('/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) {
      return;
    }

    const params = categoryIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        error: 'INVALID_PARAMS',
        message: params.error.issues[0]?.message ?? '路径参数不合法',
      });
    }

    const deletedCategory = await deleteCategoryForHousehold(access, params.data.id);
    if (!deletedCategory) {
      return reply.code(404).send({
        error: 'CATEGORY_NOT_FOUND',
        message: '分类不存在',
      });
    }

    return reply.code(204).send();
  });
};
