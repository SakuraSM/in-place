import { categories, householdMembers, households, users } from '@inplace/db';
import { eq } from 'drizzle-orm';
import { getDb } from '../../lib/db.js';
import {
  DEFAULT_CATEGORY_PRESETS,
  itemTypeForCategoryScope,
} from '../categories/category-presets.js';

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const [user] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      passwordHash: users.passwordHash,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  return user ?? null;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  displayName: string | null;
}) {
  return getDb().transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email: normalizeEmail(input.email),
        passwordHash: input.passwordHash,
        displayName: input.displayName,
      })
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        createdAt: users.createdAt,
      });

    if (!user) {
      return null;
    }

    const [household] = await tx.insert(households).values({
      name: `${user.displayName || user.email.split('@')[0]}的家庭`,
      isPersonal: true,
      createdByUserId: user.id,
    }).returning({ id: households.id });

    if (!household) {
      throw new Error('创建个人家庭空间失败');
    }

    await tx.insert(householdMembers).values({
      householdId: household.id,
      userId: user.id,
      role: 'owner',
    });

    await tx.insert(categories).values(DEFAULT_CATEGORY_PRESETS.map((preset) => ({
      userId: user.id,
      householdId: household.id,
      itemType: itemTypeForCategoryScope(preset.scope),
      scope: preset.scope,
      presetKey: preset.key,
      name: preset.name,
      icon: preset.icon,
      color: preset.color,
    })));

    return user;
  });
}

export async function updateUserProfile(userId: string, input: {
  displayName: string | null;
}) {
  const [user] = await getDb()
    .update(users)
    .set({
      displayName: input.displayName,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      createdAt: users.createdAt,
    });

  return user ?? null;
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  const [user] = await getDb()
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  return user ?? null;
}
