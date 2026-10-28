import { randomUUID } from 'node:crypto';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import type { FastifyInstance } from 'fastify';
import { createApp } from '../../app.js';
import { readEnv } from '../../env.js';
import type { CreatedMcpCredential, McpScope } from '@inplace/domain/mcp';

export interface TestAccount { id: string; token: string; householdId: string }
export async function createMcpTestApp(databaseUrl: string): Promise<FastifyInstance> {
  process.env.DATABASE_URL = databaseUrl;
  return createApp(readEnv({ NODE_ENV: 'test', DATABASE_URL: databaseUrl,
    JWT_SECRET: 'mcp-integration-only-secret-with-at-least-32-characters',
    PUBLIC_ORIGIN: 'http://localhost:4000', CORS_ORIGIN: 'http://localhost:4000' }));
}
export async function createTestAccount(app: FastifyInstance): Promise<TestAccount> {
  const response = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: {
    email: `mcp-${randomUUID()}@example.invalid`, password: 'Mcp-test-password-2026!', displayName: 'MCP 测试',
  } });
  if (response.statusCode !== 201) throw new Error('Test account registration failed');
  const { token, user } = response.json<{ token: string; user: { id: string } }>();
  const family = await app.inject({ method: 'GET', url: '/api/v1/households', headers: { authorization: `Bearer ${token}` } });
  const household = family.json<{ data: Array<{ id: string }> }>().data[0];
  if (!household) throw new Error('Test household missing');
  return { id: user.id, token, householdId: household.id };
}
export function accountHeaders(account: TestAccount): Record<string, string> {
  return { authorization: `Bearer ${account.token}`, 'x-inplace-household-id': account.householdId };
}
export async function createTestCredential(app: FastifyInstance, account: TestAccount, scopes: McpScope[] = ['inventory:read', 'inventory:import']): Promise<CreatedMcpCredential> {
  const response = await app.inject({ method: 'POST', url: '/api/v1/mcp/credentials', headers: accountHeaders(account),
    payload: { name: 'Integration Agent', scopes, expiresInDays: 7 } });
  if (response.statusCode !== 201) throw new Error(`Test credential failed (${response.statusCode})`);
  return response.json<{ data: CreatedMcpCredential }>().data;
}
export async function connectMcpClient(app: FastifyInstance, secret: string, extraHeaders: Record<string, string> = {}): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4000/api/mcp'), {
    requestInit: { headers: { authorization: `Bearer ${secret}`, ...extraHeaders } },
    fetch: async (url, init) => {
      const request = new Request(url, init);
      const response = await app.inject({
        method: request.method === 'GET' ? 'GET' : request.method === 'DELETE' ? 'DELETE' : 'POST',
        url: new URL(request.url).pathname,
        headers: { ...Object.fromEntries(request.headers), host: 'localhost:4000' },
        payload: request.method === 'POST' ? await request.text() : undefined,
      });
      const headers = new Headers();
      for (const [key, value] of Object.entries(response.headers)) {
        if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
      }
      return new Response(response.statusCode === 204 || response.statusCode === 202 && !response.body ? null : response.body, { status: response.statusCode, headers });
    },
  });
  const client = new Client({ name: 'inplace-integration', version: '1.0.0' }, { versionNegotiation: { mode: 'auto' } });
  await client.connect(transport);
  return client;
}
