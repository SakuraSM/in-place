import { authSessions, users } from '@inplace/db';
import type { AuthSession } from '@inplace/db';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { getDb } from '../../lib/db.js';

export async function createAuthSession(userId: string, ttlDays: number) {
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1_000);
  const [session] = await getDb().insert(authSessions).values({ userId, expiresAt }).returning();
  if (!session) throw new Error('Failed to create authentication session');
  return session;
}

export async function findActiveAuthSession(sessionId: string, userId: string): Promise<AuthSession | null> {
  const [session] = await getDb().select().from(authSessions).where(and(
    eq(authSessions.id, sessionId),
    eq(authSessions.userId, userId),
    isNull(authSessions.revokedAt),
    gt(authSessions.expiresAt, new Date()),
  )).limit(1);
  if (session && session.lastSeenAt.getTime() < Date.now() - 5 * 60_000) {
    await getDb().update(authSessions).set({ lastSeenAt: new Date() })
      .where(eq(authSessions.id, session.id));
  }
  return session ?? null;
}

export async function revokeAuthSession(sessionId: string, userId: string) {
  await getDb().update(authSessions).set({ revokedAt: new Date() }).where(and(
    eq(authSessions.id, sessionId),
    eq(authSessions.userId, userId),
    isNull(authSessions.revokedAt),
  ));
}

export async function revokeAllAuthSessions(userId: string) {
  await getDb().update(authSessions).set({ revokedAt: new Date() }).where(and(
    eq(authSessions.userId, userId),
    isNull(authSessions.revokedAt),
  ));
}

export async function rotatePasswordAuthSession(input: {
  userId: string;
  passwordHash: string;
  ttlDays: number;
}) {
  return getDb().transaction(async (tx) => {
    const [updatedUser] = await tx.update(users).set({
      passwordHash: input.passwordHash,
      updatedAt: new Date(),
    }).where(eq(users.id, input.userId)).returning({ id: users.id });
    if (!updatedUser) throw new Error('Failed to update user password');

    await tx.update(authSessions).set({ revokedAt: new Date() }).where(and(
      eq(authSessions.userId, input.userId),
      isNull(authSessions.revokedAt),
    ));

    const expiresAt = new Date(Date.now() + input.ttlDays * 24 * 60 * 60 * 1_000);
    const [session] = await tx.insert(authSessions).values({
      userId: input.userId,
      expiresAt,
    }).returning();
    if (!session) throw new Error('Failed to create replacement authentication session');
    return session;
  });
}
