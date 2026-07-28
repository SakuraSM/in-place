import { attachments, householdMembers, items } from '@inplace/db';
import { eq, inArray } from 'drizzle-orm';
import { getDb } from './db.js';
import { findHouseholdAccess } from '../modules/households/household.repository.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type UploadPathOwner =
  | { kind: 'household'; householdId: string; uploaderId: string }
  | { kind: 'legacy'; uploaderId: string };

export function parseUploadPathOwner(relativePath: string): UploadPathOwner | null {
  const segments = relativePath.split('/').filter(Boolean);
  if (segments.length < 3 || segments.some((segment) => segment === '.' || segment === '..')) return null;

  if (segments.length >= 4 && UUID_PATTERN.test(segments[0]!) && UUID_PATTERN.test(segments[1]!)) {
    return { kind: 'household', householdId: segments[0]!, uploaderId: segments[1]! };
  }
  if (UUID_PATTERN.test(segments[0]!)) {
    return { kind: 'legacy', uploaderId: segments[0]! };
  }
  return null;
}

export async function canUserReadUpload(userId: string, relativePath: string) {
  const owner = parseUploadPathOwner(relativePath);
  if (!owner) return false;
  if (owner.kind === 'legacy') {
    if (owner.uploaderId === userId) return true;
    const [requesterMemberships, ownerMemberships] = await Promise.all([
      getDb().select({ householdId: householdMembers.householdId }).from(householdMembers)
        .where(eq(householdMembers.userId, userId)),
      getDb().select({ householdId: householdMembers.householdId }).from(householdMembers)
        .where(eq(householdMembers.userId, owner.uploaderId)),
    ]);
    const ownerHouseholds = new Set(ownerMemberships.map((row) => row.householdId));
    const sharedHouseholdIds = requesterMemberships
      .map((row) => row.householdId)
      .filter((householdId) => ownerHouseholds.has(householdId));
    if (sharedHouseholdIds.length === 0) return false;

    const expectedPath = `/api/uploads/${relativePath}`;
    const [attachmentRows, itemRows] = await Promise.all([
      getDb().select({ fileUrl: attachments.fileUrl }).from(attachments)
        .where(inArray(attachments.householdId, sharedHouseholdIds)),
      getDb().select({ images: items.images }).from(items)
        .where(inArray(items.householdId, sharedHouseholdIds)),
    ]);
    const pathname = (value: string) => {
      try {
        return new URL(value, 'http://local.invalid').pathname;
      } catch {
        return '';
      }
    };
    return attachmentRows.some((row) => pathname(row.fileUrl) === expectedPath)
      || itemRows.some((row) => row.images.some((image) => pathname(image) === expectedPath));
  }
  return Boolean(await findHouseholdAccess({ userId, householdId: owner.householdId }));
}

export function isUploadReferenceAllowed(input: {
  value: string;
  householdId: string;
  userId: string;
  publicOrigin: string;
}) {
  let url: URL;
  try {
    url = new URL(input.value);
  } catch {
    return false;
  }
  const origin = new URL(input.publicOrigin).origin;
  if (url.origin !== origin || !url.pathname.startsWith('/api/uploads/')) {
    return url.protocol === 'https:';
  }

  let relativePath: string;
  try {
    relativePath = decodeURIComponent(url.pathname.slice('/api/uploads/'.length));
  } catch {
    return false;
  }
  const owner = parseUploadPathOwner(relativePath);
  if (!owner) return false;
  if (owner.kind === 'legacy') return owner.uploaderId === input.userId;
  return owner.householdId === input.householdId;
}
