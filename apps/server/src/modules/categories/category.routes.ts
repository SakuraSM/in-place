import type { FastifyPluginAsync } from 'fastify';
import { requireCurrentUser } from '../../lib/authenticated-request.js';
import {
  categoryIdParamsSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from './category.schemas.js';
import {
  createCategoryForUser,
  deleteCategoryForUser,
  listCategoriesForUser,
  updateCategoryForUser,
} from './category.repository.js';

export const categoryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
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
      data: await listCategoriesForUser(currentUser.id, parsed.data),
    });
  });

  app.post('/', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
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
      data: await createCategoryForUser(currentUser.id, parsed.data),
    });
  });

  app.patch('/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
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

    const updatedCategory = await updateCategoryForUser(currentUser.id, params.data.id, parsed.data);
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
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const params = categoryIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        error: 'INVALID_PARAMS',
        message: params.error.issues[0]?.message ?? '路径参数不合法',
      });
    }

    const deletedCategory = await deleteCategoryForUser(currentUser.id, params.data.id);
    if (!deletedCategory) {
      return reply.code(404).send({
        error: 'CATEGORY_NOT_FOUND',
        message: '分类不存在',
      });
    }

    return reply.code(204).send();
  });
};
