import type { FastifyPluginAsync } from 'fastify';
import { requireCurrentUser } from '../../lib/authenticated-request.js';
import { listActivityLogsQuerySchema } from './activity.schemas.js';
import { listActivityLogsForUser } from './activity.repository.js';

export const activityRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const query = listActivityLogsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({
        error: 'INVALID_QUERY',
        message: query.error.issues[0]?.message ?? '查询参数不合法',
      });
    }

    return reply.send(await listActivityLogsForUser(currentUser.id, query.data));
  });
};
