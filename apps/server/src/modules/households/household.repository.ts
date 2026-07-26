import { createHash, randomBytes } from 'node:crypto';
import {
  categories,
  householdInvites,
  householdMembers,
  households,
  users,
} from '@inplace/db';
import { and, asc, eq, gt, isNull } from 'drizzle-orm';
import { getDb } from '../../lib/db.js';
import {
  DEFAULT_CATEGORY_PRESETS,
  itemTypeForCategoryScope,
} from '../categories/category-presets.js';
import type { HouseholdRole } from './household.schemas.js';

const INVITE_TOKEN_BYTES = 32;
const INVITE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

async function createPresetCategories(input: {
  householdId: string;
  userId: string;
  transaction: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];
}) {
  await input.transaction.insert(categories).values(DEFAULT_CATEGORY_PRESETS.map((preset) => ({
    userId: input.userId,
    householdId: input.householdId,
    itemType: itemTypeForCategoryScope(preset.scope),
    scope: preset.scope,
    presetKey: preset.key,
    name: preset.name,
    icon: preset.icon,
    color: preset.color,
  })));
}

export async function createHouseholdForUser(input: {
  userId: string;
  name: string;
  isPersonal?: boolean;
}) {
  return getDb().transaction(async (transaction) => {
    const [household] = await transaction.insert(households).values({
      name: input.name,
      isPersonal: input.isPersonal ?? false,
      createdByUserId: input.userId,
    }).returning();

    if (!household) {
      throw new Error('创建家庭空间失败');
    }

    await transaction.insert(householdMembers).values({
      householdId: household.id,
      userId: input.userId,
      role: 'owner',
    });

    await createPresetCategories({
      householdId: household.id,
      userId: input.userId,
      transaction,
    });

    return household;
  });
}

export async function listHouseholdsForUser(userId: string) {
  return getDb()
    .select({
      id: households.id,
      name: households.name,
      isPersonal: households.isPersonal,
      createdByUserId: households.createdByUserId,
      role: householdMembers.role,
      createdAt: households.createdAt,
      updatedAt: households.updatedAt,
    })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(eq(householdMembers.userId, userId))
    .orderBy(asc(households.createdAt));
}

export async function findHouseholdAccess(input: {
  userId: string;
  householdId?: string | null;
}) {
  const filters = [eq(householdMembers.userId, input.userId)];
  if (input.householdId) {
    filters.push(eq(householdMembers.householdId, input.householdId));
  } else {
    filters.push(eq(households.isPersonal, true));
  }

  const [membership] = await getDb()
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
      householdName: households.name,
    })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(and(...filters))
    .limit(1);

  return membership ?? null;
}

export async function listHouseholdMembers(householdId: string) {
  return getDb()
    .select({
      id: householdMembers.id,
      householdId: householdMembers.householdId,
      userId: householdMembers.userId,
      displayName: users.displayName,
      email: users.email,
      role: householdMembers.role,
      joinedAt: householdMembers.joinedAt,
    })
    .from(householdMembers)
    .innerJoin(users, eq(householdMembers.userId, users.id))
    .where(eq(householdMembers.householdId, householdId))
    .orderBy(asc(householdMembers.joinedAt));
}

export async function createHouseholdInvite(input: {
  householdId: string;
  userId: string;
  role: Exclude<HouseholdRole, 'owner'>;
}) {
  const token = randomBytes(INVITE_TOKEN_BYTES).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITE_EXPIRATION_MS);
  const [invite] = await getDb().insert(householdInvites).values({
    householdId: input.householdId,
    tokenHash: hashInviteToken(token),
    role: input.role,
    createdByUserId: input.userId,
    expiresAt,
  }).returning();

  if (!invite) {
    throw new Error('创建邀请失败');
  }

  return { invite, token };
}

export async function acceptHouseholdInvite(input: {
  token: string;
  userId: string;
}) {
  return getDb().transaction(async (transaction) => {
    const [invite] = await transaction
      .update(householdInvites)
      .set({ usedAt: new Date() })
      .where(and(
        eq(householdInvites.tokenHash, hashInviteToken(input.token)),
        isNull(householdInvites.usedAt),
        isNull(householdInvites.revokedAt),
        gt(householdInvites.expiresAt, new Date()),
      ))
      .returning();

    if (!invite) {
      return null;
    }

    await transaction.insert(householdMembers).values({
      householdId: invite.householdId,
      userId: input.userId,
      role: invite.role,
    }).onConflictDoNothing();

    return invite.householdId;
  });
}

export async function revokeHouseholdInvite(input: { householdId: string; inviteId: string }) {
  const [invite] = await getDb().update(householdInvites).set({
    revokedAt: new Date(),
  }).where(and(
    eq(householdInvites.id, input.inviteId),
    eq(householdInvites.householdId, input.householdId),
    isNull(householdInvites.usedAt),
    isNull(householdInvites.revokedAt),
  )).returning();
  return invite ?? null;
}

export async function updateHouseholdMemberRole(input: {
  householdId: string;
  memberId: string;
  role: Exclude<HouseholdRole, 'owner'>;
}) {
  const [member] = await getDb().update(householdMembers)
    .set({ role: input.role })
    .where(and(
      eq(householdMembers.id, input.memberId),
      eq(householdMembers.householdId, input.householdId),
    ))
    .returning();

  return member ?? null;
}

export async function removeHouseholdMember(input: {
  householdId: string;
  memberId: string;
}) {
  const [member] = await getDb().delete(householdMembers)
    .where(and(
      eq(householdMembers.id, input.memberId),
      eq(householdMembers.householdId, input.householdId),
      eq(householdMembers.role, 'viewer'),
    ))
    .returning();

  if (member) {
    return member;
  }

  const [editor] = await getDb().delete(householdMembers)
    .where(and(
      eq(householdMembers.id, input.memberId),
      eq(householdMembers.householdId, input.householdId),
      eq(householdMembers.role, 'editor'),
    ))
    .returning();

  return editor ?? null;
}
