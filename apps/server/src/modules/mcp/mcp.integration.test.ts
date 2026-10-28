import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { activityLogs, getPool, householdMembers, households, items, mcpCredentials, mcpImportRequests, users } from '@inplace/db';
import type { Client } from '@modelcontextprotocol/client';
import type { FastifyInstance } from 'fastify';
import { getDb } from '../../lib/db.js';
import { hashMcpToken } from './mcp-credentials.repository.js';
import { accountHeaders, connectMcpClient, createMcpTestApp, createTestAccount, createTestCredential, type TestAccount } from './mcp-test-fixture.js';

const databaseUrl = process.env.MCP_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)('MCP with isolated PostgreSQL and real SDK client', () => {
  let app: FastifyInstance;
  let owner: TestAccount;
  let outsider: TestAccount;
  let foreignParentId: string;
  const clients: Client[] = [];
  async function connect(secret: string, extraHeaders?: Record<string, string>) {
    const client = await connectMcpClient(app, secret, extraHeaders); clients.push(client); return client;
  }
  function batch(name = 'MCP 批量物品') {
    return { requestKey: randomUUID(), items: [
      { key: 'item', kind: 'item', name, parentKey: 'box', quantity: 2, tags: ['MCP 导入'] },
      { key: 'box', kind: 'container', name: 'MCP 收纳箱', parentKey: 'room' },
      { key: 'room', kind: 'location', name: 'MCP 书房' },
    ] };
  }
  async function inventoryCount(): Promise<number> {
    const [result] = await getDb().select({ total: count() }).from(items).where(eq(items.householdId, owner.householdId));
    return result.total;
  }
  beforeAll(async () => {
    app = await createMcpTestApp(databaseUrl!);
    owner = await createTestAccount(app); outsider = await createTestAccount(app);
    const [foreign] = await getDb().insert(items).values({ householdId: outsider.householdId, userId: outsider.id, name: '外部家庭容器', type: 'container' }).returning();
    foreignParentId = foreign.id;
  });
  afterAll(async () => {
    await Promise.all(clients.map(client => client.close()));
    if (owner && outsider) {
      await getDb().delete(households).where(inArray(households.id, [owner.householdId, outsider.householdId]));
      await getDb().delete(users).where(inArray(users.id, [owner.id, outsider.id]));
    }
    await app?.close(); await getPool().end();
  });
  it('shows the secret only on creation, stores its digest and scopes credentials to their owner', async () => {
    const created = await createTestCredential(app, owner);
    expect(created.secret).toMatch(/^ip_mcp_[A-Za-z0-9_-]{43}$/);
    const [stored] = await getDb().select().from(mcpCredentials).where(eq(mcpCredentials.id, created.credential.id));
    expect(stored.tokenHash).toBe(hashMcpToken(created.secret));
    const listing = await app.inject({ method: 'GET', url: '/api/v1/mcp/credentials', headers: accountHeaders(owner) });
    expect(listing.headers['cache-control']).toBe('no-store');
    expect(listing.body).not.toContain(created.secret);
    expect(listing.body).not.toContain(stored.tokenHash);
    const revoke = await app.inject({ method: 'DELETE', url: `/api/v1/mcp/credentials/${created.credential.id}`, headers: accountHeaders(outsider) });
    expect(revoke.statusCode).toBe(404);
    const oversized = await app.inject({ method: 'POST', url: '/api/v1/mcp/credentials', headers: accountHeaders(owner),
      payload: { name: 'x'.repeat(5000), scopes: ['inventory:read'], expiresInDays: 7 } });
    expect(oversized.statusCode).toBe(413);
  });
  it('negotiates MCP, lists tools, and ignores client attempts to switch the credential household', async () => {
    const created = await createTestCredential(app, owner);
    const client = await connect(created.secret, { 'x-inplace-household-id': outsider.householdId });
    expect((await client.listTools()).tools.map(tool => tool.name)).toContain('inventory_import');
    expect((await client.callTool({ name: 'inventory_context' })).structuredContent).toMatchObject({ householdId: owner.householdId });
    const foreign = await client.callTool({ name: 'inventory_get', arguments: { id: foreignParentId } });
    expect(foreign.isError).toBe(true);
    expect((await client.callTool({ name: 'inventory_search', arguments: { query: '外部家庭容器' } })).structuredContent).toMatchObject({ data: [], meta: { total: 0 } });
    expect((await client.callTool({ name: 'inventory_categories' })).isError).not.toBe(true);
  });
  it('keeps read credentials read-only and rejects import calls', async () => {
    const client = await connect((await createTestCredential(app, owner, ['inventory:read'])).secret);
    expect((await client.listTools()).tools.map(tool => tool.name)).not.toContain('inventory_import');
    const before = await inventoryCount();
    await expect(client.callTool({ name: 'inventory_import', arguments: { ...batch(), dryRun: false } })).rejects.toThrow('not found');
    expect(await inventoryCount()).toBe(before);
  });
  it('previews without writing and imports a hierarchy atomically, deduplicating concurrent retries', async () => {
    const created = await createTestCredential(app, owner);
    const client = await connect(created.secret);
    const input = batch();
    const before = await inventoryCount();
    expect((await client.callTool({ name: 'inventory_import', arguments: input })).structuredContent).toMatchObject({ dryRun: true, count: 3 });
    expect(await inventoryCount()).toBe(before);
    const results = await Promise.all([
      client.callTool({ name: 'inventory_import', arguments: { ...input, dryRun: false } }),
      client.callTool({ name: 'inventory_import', arguments: { ...input, dryRun: false } }),
    ]);
    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({ structuredContent: expect.objectContaining({ replayed: false }) }),
      expect.objectContaining({ structuredContent: expect.objectContaining({ replayed: true }) }),
    ]));
    expect(await inventoryCount()).toBe(before + 3);
    const rows = await getDb().select().from(items).where(eq(items.householdId, owner.householdId));
    const room = rows.find(row => row.name === 'MCP 书房');
    const box = rows.find(row => row.name === 'MCP 收纳箱');
    const item = rows.find(row => row.name === 'MCP 批量物品');
    expect(room?.metadata.location_tag).toBe(true); expect(box?.parentId).toBe(room?.id); expect(item?.parentId).toBe(box?.id);
    const logs = await getDb().select().from(activityLogs).where(eq(activityLogs.householdId, owner.householdId));
    expect(logs.filter(log => log.metadata.request_key === input.requestKey)).toHaveLength(3);
    const changed = await client.callTool({ name: 'inventory_import', arguments: { ...input, dryRun: false, items: [{ key: 'new', name: '不同内容' }] } });
    expect(changed.isError).toBe(true); expect(await inventoryCount()).toBe(before + 3);
  });
  it('rejects cross-household parents and cyclic batches without partial additions', async () => {
    const client = await connect((await createTestCredential(app, owner)).secret);
    const before = await inventoryCount();
    for (const entries of [
      [{ key: 'first', name: '合法条目' }, { key: 'foreign', name: '非法条目', parentId: foreignParentId }],
      [{ key: 'a', name: '循环', kind: 'container', parentKey: 'b' }, { key: 'b', name: '循环', kind: 'container', parentKey: 'a' }],
    ]) expect((await client.callTool({ name: 'inventory_import', arguments: { requestKey: randomUUID(), dryRun: false, items: entries } })).isError).toBe(true);
    expect(await inventoryCount()).toBe(before);
  });
  it('rolls back inventory and deduplication records if activity persistence fails', async () => {
    const created = await createTestCredential(app, owner);
    const client = await connect(created.secret);
    const input = batch('MCP force rollback');
    const before = await inventoryCount();
    await getDb().execute(sql`alter table activity_logs add constraint mcp_test_rollback check (item_name <> 'MCP force rollback')`);
    try {
      expect((await client.callTool({ name: 'inventory_import', arguments: { ...input, dryRun: false } })).isError).toBe(true);
      expect(await inventoryCount()).toBe(before);
      const saved = await getDb().select().from(mcpImportRequests).where(and(eq(mcpImportRequests.credentialId, created.credential.id), eq(mcpImportRequests.requestKey, input.requestKey)));
      expect(saved).toHaveLength(0);
    } finally { await getDb().execute(sql`alter table activity_logs drop constraint mcp_test_rollback`); }
  });
  it('honors role downgrades on the next request and forbids minting import credentials as a viewer', async () => {
    const client = await connect((await createTestCredential(app, owner)).secret);
    const membership = and(eq(householdMembers.userId, owner.id), eq(householdMembers.householdId, owner.householdId));
    await getDb().update(householdMembers).set({ role: 'viewer' }).where(membership);
    try {
      expect((await client.listTools()).tools.map(tool => tool.name)).not.toContain('inventory_import');
      const response = await app.inject({ method: 'POST', url: '/api/v1/mcp/credentials', headers: accountHeaders(owner), payload: { name: 'forbidden', scopes: ['inventory:read', 'inventory:import'], expiresInDays: 7 } });
      expect(response.statusCode).toBe(403);
    } finally { await getDb().update(householdMembers).set({ role: 'owner' }).where(membership); }
  });
  it('rejects a revoked, expired, or removed-member credential on subsequent requests', async () => {
    for (const mode of ['revoked', 'expired', 'removed'] as const) {
      const created = await createTestCredential(app, outsider);
      const client = await connect(created.secret);
      if (mode === 'revoked') await app.inject({ method: 'DELETE', url: `/api/v1/mcp/credentials/${created.credential.id}`, headers: accountHeaders(outsider) });
      if (mode === 'expired') await getDb().update(mcpCredentials).set({ expiresAt: new Date(0) }).where(eq(mcpCredentials.id, created.credential.id));
      if (mode === 'removed') await getDb().delete(householdMembers).where(and(eq(householdMembers.userId, outsider.id), eq(householdMembers.householdId, outsider.householdId)));
      await expect(client.callTool({ name: 'inventory_context' })).rejects.toThrow();
      if (mode === 'removed') {
        await getDb().insert(householdMembers).values({ householdId: outsider.householdId, userId: outsider.id, role: 'owner' });
        await expect(client.callTool({ name: 'inventory_context' })).rejects.toThrow();
      }
    }
  });
  it('requires a dedicated bearer credential and validates Host, Origin, and methods', async () => {
    const created = await createTestCredential(app, owner, ['inventory:read']);
    const payload = { jsonrpc: '2.0', id: 1, method: 'tools/list' };
    for (const authorization of [undefined, `Bearer ${owner.token}`, 'Bearer invalid']) {
      const response = await app.inject({ method: 'POST', url: '/api/mcp', headers: { host: 'localhost:4000', ...(authorization ? { authorization } : {}) }, payload });
      expect(response.statusCode).toBe(401);
    }
    const headers = { host: 'localhost:4000', authorization: `Bearer ${created.secret}` };
    expect((await app.inject({ method: 'POST', url: '/api/mcp', headers: { ...headers, host: 'evil.example' }, payload })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/mcp', headers: { ...headers, origin: 'https://evil.example' }, payload })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/api/mcp', headers })).statusCode).toBe(405);
    const legacy = await app.inject({ method: 'POST', url: '/api/mcp', headers: { ...headers, accept: 'application/json, text/event-stream' },
      payload: { jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'legacy-test', version: '1' } } } });
    expect(legacy.statusCode).toBe(200);
    expect(legacy.body).toContain('"protocolVersion":"2025-11-25"');
  });
});
