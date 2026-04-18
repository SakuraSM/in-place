import type { FastifyPluginAsync } from 'fastify';
import { requireCurrentUser } from '../../lib/authenticated-request.js';
import { createTagForUser, deleteTagForUser, listTagsForUser, updateTagForUser } from './tag.repository.js';
import { createTagSchema, listTagsQuerySchema, tagIdParamsSchema, updateTagSchema } from './tag.schemas.js';

export const tagRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const query = listTagsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({
        error: 'INVALID_QUERY',
        message: query.error.issues[0]?.message ?? '查询参数不合法',
      });
    }

    return reply.send(await listTagsForUser(currentUser.id, query.data));
  });

  app.post('/', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const parsed = createTagSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? '请求参数不合法',
      });
    }

    try {
      return reply.code(201).send({
        data: await createTagForUser(currentUser.id, parsed.data),
      });
    } catch (error) {
      return reply.code(409).send({
        error: 'TAG_CONFLICT',
        message: error instanceof Error ? error.message : '标签名称已存在',
      });
    }
  });

  app.patch('/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const params = tagIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        error: 'INVALID_PARAMS',
        message: params.error.issues[0]?.message ?? '路径参数不合法',
      });
    }

    const parsed = updateTagSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? '请求参数不合法',
      });
    }

    try {
      const updated = await updateTagForUser(currentUser.id, params.data.id, parsed.data);
      if (!updated) {
        return reply.code(404).send({
          error: 'TAG_NOT_FOUND',
          message: '标签不存在',
        });
      }

      return reply.send({ data: updated });
    } catch (error) {
      return reply.code(409).send({
        error: 'TAG_CONFLICT',
        message: error instanceof Error ? error.message : '标签名称已存在',
      });
    }
  });

  app.delete('/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const params = tagIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        error: 'INVALID_PARAMS',
        message: params.error.issues[0]?.message ?? '路径参数不合法',
      });
    }

    const deleted = await deleteTagForUser(currentUser.id, params.data.id);
    if (!deleted) {
      return reply.code(404).send({
        error: 'TAG_NOT_FOUND',
        message: '标签不存在',
      });
    }

    return reply.code(204).send();
  });
};
