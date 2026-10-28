import { createHash, randomUUID } from 'node:crypto';
import { activityLogs, householdMembers, items, mcpCredentials, mcpImportRequests, tagRegistry } from '@inplace/db';
import { and, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { getDb } from '../../lib/db.js';
import { isUploadReferenceAllowed } from '../../lib/upload-access.js';
import { createItemSchema } from '../items/item.schemas.js';
import { toCreateValues } from '../items/item.repository.js';
import { McpInputError, planImportEntries, type ImportEntriesInput } from './mcp-import.schema.js';
import type { McpAccess } from './mcp-credentials.repository.js';

interface ImportContext { access: McpAccess; publicOrigin: string; input: ImportEntriesInput }

export async function importMcpInventory({ access, publicOrigin, input }: ImportContext) {
  const ordered = planImportEntries(input.items);
  const payloadHash = createHash('sha256').update(JSON.stringify(input.items)).digest('hex');
  for (const entry of ordered) {
    if (entry.images.some(value => !isUploadReferenceAllowed({ value, ...access, publicOrigin }))) {
      throw new McpInputError('图片不属于当前家庭或不是安全的 HTTPS 地址');
    }
  }
  return getDb().transaction(async transaction => {
    // Serialize this household's MCP batches, including concurrent retries and tag creation.
    await transaction.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`mcp:${access.householdId}`}, 0))`);
    const [permission] = await transaction.select({ scopes: mcpCredentials.scopes, role: householdMembers.role })
      .from(mcpCredentials).innerJoin(householdMembers, and(
        eq(householdMembers.id, mcpCredentials.membershipId),
        eq(householdMembers.userId, mcpCredentials.userId), eq(householdMembers.householdId, mcpCredentials.householdId),
      )).where(and(eq(mcpCredentials.id, access.credentialId), eq(mcpCredentials.userId, access.userId),
        eq(mcpCredentials.householdId, access.householdId), isNull(mcpCredentials.revokedAt), gt(mcpCredentials.expiresAt, new Date())))
      .for('share');
    if (!permission || permission.role === 'viewer' || !permission.scopes.includes('inventory:import')) {
      throw new McpInputError('导入权限已失效，请重新检查凭证与家庭角色');
    }
    const [previous] = await transaction.select().from(mcpImportRequests).where(and(
      eq(mcpImportRequests.credentialId, access.credentialId), eq(mcpImportRequests.requestKey, input.requestKey),
    ));
    if (previous) {
      if (previous.payloadHash !== payloadHash) throw new McpInputError('该请求编号已用于不同内容，请使用新的 requestKey');
      return { ...previous.result, dryRun: input.dryRun, replayed: true, alreadyImported: true };
    }

    const parentIds = [...new Set(ordered.flatMap(entry => entry.parentId ? [entry.parentId] : []))];
    if (parentIds.length) {
      const parents = await transaction.select({ id: items.id, type: items.type }).from(items)
        .where(and(eq(items.householdId, access.householdId), inArray(items.id, parentIds))).for('share');
      if (parents.length !== parentIds.length || parents.some(parent => parent.type !== 'container')) {
        throw new McpInputError('parentId 不存在、属于其他家庭，或不是位置/收纳');
      }
    }
    if (input.dryRun) {
      return { dryRun: true, replayed: false, count: ordered.length,
        items: ordered.map(entry => ({ key: entry.key, name: entry.name, kind: entry.kind, parentKey: entry.parentKey ?? null, parentId: entry.parentId ?? null })) };
    }

    const ids = new Map(ordered.map(entry => [entry.key, randomUUID()]));
    const values = ordered.map(entry => {
      const normalized = createItemSchema.parse({
        ...entry, type: entry.kind === 'item' ? 'item' : 'container',
        parentId: entry.parentKey ? ids.get(entry.parentKey) : entry.parentId ?? null,
        metadata: { ...entry.metadata, location_tag: entry.kind === 'location' },
      });
      return { ...toCreateValues(normalized), id: ids.get(entry.key)!, userId: access.userId, householdId: access.householdId };
    });
    await transaction.insert(items).values(values);
    const existingTags = await transaction.select({ name: tagRegistry.name }).from(tagRegistry)
      .where(eq(tagRegistry.householdId, access.householdId));
    const names = new Set(existingTags.map(tag => tag.name.toLocaleLowerCase('zh-CN')));
    const missingTags: string[] = [];
    for (const tag of values.flatMap(entry => entry.tags)) {
      const normalized = tag.toLocaleLowerCase('zh-CN');
      if (!names.has(normalized)) { names.add(normalized); missingTags.push(tag); }
    }
    if (missingTags.length) {
      await transaction.insert(tagRegistry).values(missingTags.map(name => ({ userId: access.userId, householdId: access.householdId, name }))).onConflictDoNothing();
    }
    await transaction.insert(activityLogs).values(values.map(entry => ({
      userId: access.userId, actorUserId: access.userId, householdId: access.householdId,
      itemId: entry.id, itemName: entry.name, itemType: entry.type, action: 'manual_create' as const,
      metadata: { source: 'mcp', credential_id: access.credentialId, request_key: input.requestKey, parent_id: entry.parentId },
    })));
    const result = { count: ordered.length, items: ordered.map(entry => ({ key: entry.key, id: ids.get(entry.key)!, name: entry.name, kind: entry.kind })) };
    await transaction.insert(mcpImportRequests).values({ credentialId: access.credentialId, requestKey: input.requestKey, payloadHash, result });
    return { ...result, dryRun: false, replayed: false, alreadyImported: false };
  });
}
