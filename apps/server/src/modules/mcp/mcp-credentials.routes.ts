import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod-mcp';
import { getPublicOrigin, type AppEnv } from '../../env.js';
import { requireHouseholdAccess } from '../../lib/household-access.js';
import { BoundedRateLimiter, sendRateLimit } from '../../lib/bounded-rate-limit.js';
import { createMcpCredential, listMcpCredentials, revokeMcpCredential } from './mcp-credentials.repository.js';

const MINUTE_MS = 60_000;
const CREATE_LIMIT = 10;
const CREDENTIAL_BODY_LIMIT = 4096;
const MAX_EXPIRY_DAYS = 365;
const DEFAULT_EXPIRY_DAYS = 90;
const credentialSchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z.array(z.enum(['inventory:read', 'inventory:import'])).min(1).max(2)
    .refine(scopes => scopes.includes('inventory:read') && new Set(scopes).size === scopes.length, '必须包含读取权限，且权限不能重复'),
  expiresInDays: z.number().int().min(1).max(MAX_EXPIRY_DAYS).default(DEFAULT_EXPIRY_DAYS),
}).strict();

export const mcpCredentialRoutes: FastifyPluginAsync<{ env: AppEnv }> = async (app, { env }) => {
  const createLimit = new BoundedRateLimiter(CREATE_LIMIT, MINUTE_MS);
  app.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'no-store'); });

  app.get('/', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) return;
    return { data: { endpoint: `${getPublicOrigin(env)}/api/mcp`, householdName: access.householdName,
      canImport: access.role !== 'viewer', credentials: await listMcpCredentials(access) } };
  });

  app.post('/', { preHandler: app.authenticate, bodyLimit: CREDENTIAL_BODY_LIMIT }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) return;
    const rate = createLimit.consume(access.userId);
    if (!rate.allowed) return sendRateLimit(reply, rate.retryAfterSeconds);
    const input = credentialSchema.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: 'INVALID_REQUEST', message: input.error.issues[0]?.message });
    if (access.role === 'viewer' && input.data.scopes.includes('inventory:import')) {
      return reply.code(403).send({ error: 'FORBIDDEN', message: '只读成员不能创建导入凭证' });
    }
    const created = await createMcpCredential(access, input.data);
    if (!created) return reply.code(403).send({ error: 'FORBIDDEN', message: '家庭权限已变化，请重新加载' });
    return reply.code(201).send({ data: created });
  });

  app.delete('/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const access = await requireHouseholdAccess({ request, reply });
    if (!access) return;
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'INVALID_REQUEST', message: '凭证 ID 不合法' });
    if (!await revokeMcpCredential(access, params.data.id)) return reply.code(404).send({ error: 'NOT_FOUND', message: '凭证不存在' });
    return reply.code(204).send();
  });
};
