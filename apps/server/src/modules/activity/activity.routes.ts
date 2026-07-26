import type { FastifyPluginAsync } from 'fastify';
import { requireHouseholdAccess } from '../../lib/household-access.js';
import { listActivityLogsQuerySchema } from './activity.schemas.js';
import { listActivityLogsForHousehold } from './activity.repository.js';

export const activityRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) {
      return;
    }

    const query = listActivityLogsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({
        error: 'INVALID_QUERY',
        message: query.error.issues[0]?.message ?? '查询参数不合法',
      });
    }

    return reply.send(await listActivityLogsForHousehold(access.householdId, query.data));
  });
};
