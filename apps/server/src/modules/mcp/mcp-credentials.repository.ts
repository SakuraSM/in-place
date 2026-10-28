import { createHash, randomBytes } from 'node:crypto';
import { householdMembers, households, mcpCredentials } from '@inplace/db';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import type { CreateMcpCredentialInput, McpCredential, McpScope } from '@inplace/domain/mcp';
import type { HouseholdRole } from '../households/household.schemas.js';
import { getDb } from '../../lib/db.js';

const TOKEN_BYTES = 32;
const TOKEN_PREFIX_LENGTH = 15;
const DAY_MS = 86_400_000;
const MCP_TOKEN_PATTERN = /^ip_mcp_[A-Za-z0-9_-]{43}$/;

export interface McpAccess {
  credentialId: string;
  userId: string;
  householdId: string;
  householdName: string;
  role: HouseholdRole;
  scopes: McpScope[];
}

interface CredentialOwner { userId: string; householdId: string }

export function hashMcpToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toCredential(row: typeof mcpCredentials.$inferSelect): McpCredential {
  return {
    id: row.id, name: row.name, tokenPrefix: row.tokenPrefix, householdId: row.householdId,
    scopes: row.scopes, createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null, revokedAt: row.revokedAt?.toISOString() ?? null,
  };
}

export async function listMcpCredentials(owner: CredentialOwner): Promise<McpCredential[]> {
  const rows = await getDb().select().from(mcpCredentials)
    .where(and(eq(mcpCredentials.userId, owner.userId), eq(mcpCredentials.householdId, owner.householdId)))
    .orderBy(desc(mcpCredentials.createdAt));
  return rows.map(toCredential);
}

export async function createMcpCredential(owner: CredentialOwner, input: CreateMcpCredentialInput) {
  const secret = `ip_mcp_${randomBytes(TOKEN_BYTES).toString('base64url')}`;
  return getDb().transaction(async transaction => {
    const [membership] = await transaction.select().from(householdMembers)
      .where(and(eq(householdMembers.userId, owner.userId), eq(householdMembers.householdId, owner.householdId))).for('share');
    if (!membership || membership.role === 'viewer' && input.scopes.includes('inventory:import')) return null;
    const [row] = await transaction.insert(mcpCredentials).values({
      ...owner, membershipId: membership.id, name: input.name, scopes: input.scopes,
      tokenHash: hashMcpToken(secret), tokenPrefix: secret.slice(0, TOKEN_PREFIX_LENGTH),
      expiresAt: new Date(Date.now() + input.expiresInDays * DAY_MS),
    }).returning();
    if (!row) throw new Error('MCP credential creation failed');
    return { credential: toCredential(row), secret };
  });
}

export async function revokeMcpCredential(owner: CredentialOwner, id: string): Promise<boolean> {
  const rows = await getDb().update(mcpCredentials).set({ revokedAt: new Date() })
    .where(and(eq(mcpCredentials.id, id), eq(mcpCredentials.userId, owner.userId), eq(mcpCredentials.householdId, owner.householdId)))
    .returning({ id: mcpCredentials.id });
  return rows.length > 0;
}

export async function authenticateMcpCredential(authorization: string | undefined): Promise<McpAccess | null> {
  const token = /^Bearer\s+(\S+)$/i.exec(authorization ?? '')?.[1];
  if (!token || !MCP_TOKEN_PATTERN.test(token)) return null;
  const [access] = await getDb().select({
    credentialId: mcpCredentials.id, userId: mcpCredentials.userId,
    householdId: mcpCredentials.householdId, householdName: households.name,
    scopes: mcpCredentials.scopes, role: householdMembers.role,
  }).from(mcpCredentials)
    .innerJoin(householdMembers, and(eq(householdMembers.id, mcpCredentials.membershipId), eq(householdMembers.userId, mcpCredentials.userId), eq(householdMembers.householdId, mcpCredentials.householdId)))
    .innerJoin(households, eq(households.id, mcpCredentials.householdId))
    .where(and(eq(mcpCredentials.tokenHash, hashMcpToken(token)), isNull(mcpCredentials.revokedAt), gt(mcpCredentials.expiresAt, new Date())))
    .limit(1);
  if (!access || !access.scopes.includes('inventory:read')) return null;
  await getDb().update(mcpCredentials).set({ lastUsedAt: new Date() }).where(eq(mcpCredentials.id, access.credentialId));
  return access;
}
