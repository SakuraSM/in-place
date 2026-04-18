import { users } from '@inplace/db';
import { eq } from 'drizzle-orm';
import { getDb } from '../../lib/db.js';

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
  const [user] = await getDb()
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

  return user ?? null;
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
