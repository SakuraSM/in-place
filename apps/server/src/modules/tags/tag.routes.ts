import type { FastifyPluginAsync } from 'fastify';
import { requireHouseholdAccess } from '../../lib/household-access.js';
import { createTagForHousehold, deleteTagForHousehold, listTagsForHousehold, updateTagForHousehold } from './tag.repository.js';
import { createTagSchema, listTagsQuerySchema, tagIdParamsSchema, updateTagSchema } from './tag.schemas.js';

export const tagRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) {
      return;
    }

    const query = listTagsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({
        error: 'INVALID_QUERY',
        message: query.error.issues[0]?.message ?? '查询参数不合法',
      });
    }

    return reply.send(await listTagsForHousehold(access.householdId, query.data));
  });

  app.post('/', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) {
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
        data: await createTagForHousehold(access, parsed.data),
      });
    } catch (error) {
      return reply.code(409).send({
        error: 'TAG_CONFLICT',
        message: error instanceof Error ? error.message : '标签名称已存在',
      });
    }
  });

  app.patch('/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) {
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
      const updated = await updateTagForHousehold(access.householdId, params.data.id, parsed.data);
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
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'editor' });
    if (!access) {
      return;
    }

    const params = tagIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({
        error: 'INVALID_PARAMS',
        message: params.error.issues[0]?.message ?? '路径参数不合法',
      });
    }

    const deleted = await deleteTagForHousehold(access.householdId, params.data.id);
    if (!deleted) {
      return reply.code(404).send({
        error: 'TAG_NOT_FOUND',
        message: '标签不存在',
      });
    }

    return reply.code(204).send();
  });
};
