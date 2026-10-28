import type { FastifyPluginAsync } from 'fastify';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { getAllowedCorsOrigins, getPublicOrigin, type AppEnv } from '../../env.js';
import { BoundedRateLimiter, sendRateLimit } from '../../lib/bounded-rate-limit.js';
import { authenticateMcpCredential } from './mcp-credentials.repository.js';
import { createInventoryMcpServer } from './mcp-server.js';

const MCP_BODY_LIMIT = 1_048_576;
const MCP_REQUESTS_PER_MINUTE = 120;
const MCP_IP_REQUESTS_PER_MINUTE = 240;
const MINUTE_MS = 60_000;

export const mcpRoutes: FastifyPluginAsync<{ env: AppEnv }> = async (app, { env }) => {
  const publicOrigin = getPublicOrigin(env);
  const origins = new Set([...getAllowedCorsOrigins(env), publicOrigin]);
  const hosts = new Set([new URL(publicOrigin).host, `localhost:${env.PORT}`, `127.0.0.1:${env.PORT}`, `10.0.2.2:${env.PORT}`]);
  const rateLimit = new BoundedRateLimiter(MCP_REQUESTS_PER_MINUTE, MINUTE_MS);
  const ipLimit = new BoundedRateLimiter(MCP_IP_REQUESTS_PER_MINUTE, MINUTE_MS);

  app.all('/api/mcp', { bodyLimit: MCP_BODY_LIMIT }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (!hosts.has(request.host.toLowerCase()) || request.headers.origin && !origins.has(request.headers.origin)) {
      return reply.code(403).send({ error: 'UNTRUSTED_ORIGIN', message: 'MCP 请求来源不受信任' });
    }
    const ipRate = ipLimit.consume(request.ip);
    if (!ipRate.allowed) return sendRateLimit(reply, ipRate.retryAfterSeconds);
    const access = await authenticateMcpCredential(request.headers.authorization);
    if (!access) return reply.header('WWW-Authenticate', 'Bearer realm="inplace-mcp"').code(401)
      .send({ error: 'INVALID_CREDENTIAL', message: 'MCP 凭证无效、已过期或已撤销' });
    const rate = rateLimit.consume(access.credentialId);
    if (!rate.allowed) return sendRateLimit(reply, rate.retryAfterSeconds);
    if (request.method !== 'POST') return reply.header('Allow', 'POST').code(405).send({ error: 'METHOD_NOT_ALLOWED' });
    const handler = createMcpHandler(() => createInventoryMcpServer({
      access, publicOrigin, onError: error => request.log.error({ errorType: error instanceof Error ? error.name : 'UnknownError' }, 'MCP tool failed'),
    }));
    const abort = new AbortController();
    const close = () => { abort.abort(); void handler.close().catch(() => request.log.error('MCP connection cleanup failed')); };
    reply.raw.once('close', close);
    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(request.headers)) {
        if (typeof value === 'string' && !['authorization', 'cookie', 'content-length', 'host', 'connection'].includes(key)) headers.set(key, value);
      }
      const response = await handler.fetch(new Request(`${publicOrigin}/api/mcp`, {
        method: 'POST', headers, body: JSON.stringify(request.body), signal: abort.signal,
      }));
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.header('Cache-Control', 'no-store');
      return reply.code(response.status).send(response.body ?? '');
    } catch (error) {
      reply.raw.removeListener('close', close);
      await handler.close();
      throw error;
    }
  });
};
