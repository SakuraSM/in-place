import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findHouseholdAccess } from '../modules/households/household.repository.js';
import { getDb } from './db.js';
import { canUserReadUpload, isUploadReferenceAllowed, parseUploadPathOwner } from './upload-access.js';

vi.mock('../modules/households/household.repository.js', () => ({
  findHouseholdAccess: vi.fn(),
}));
vi.mock('./db.js', () => ({
  getDb: vi.fn(),
}));

const USER = '00000000-0000-4000-8000-000000000001';
const HOUSEHOLD = '00000000-0000-4000-8000-000000000002';
const OTHER_HOUSEHOLD = '00000000-0000-4000-8000-000000000003';

describe('upload access boundary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('binds new uploads to the household encoded in their path', async () => {
    vi.mocked(findHouseholdAccess).mockResolvedValueOnce({ role: 'viewer' } as never);
    const relative = `${HOUSEHOLD}/${USER}/2026-07-28/image.webp`;
    expect(parseUploadPathOwner(relative)).toEqual({
      kind: 'household',
      householdId: HOUSEHOLD,
      uploaderId: USER,
    });
    expect(await canUserReadUpload(USER, relative)).toBe(true);
    expect(findHouseholdAccess).toHaveBeenCalledWith({ userId: USER, householdId: HOUSEHOLD });
  });

  it('keeps legacy uploads available to their owner without trusting unrelated references', async () => {
    const relative = `${USER}/2026-07-28/legacy.webp`;
    expect(await canUserReadUpload(USER, relative)).toBe(true);
    expect(findHouseholdAccess).not.toHaveBeenCalled();
  });

  it('does not let an unrelated household self-authorize a legacy victim URL', async () => {
    const requesterHousehold = '00000000-0000-4000-8000-000000000008';
    const select = vi.fn()
      .mockReturnValueOnce({
        from: () => ({ where: async () => [{ householdId: requesterHousehold }] }),
      })
      .mockReturnValueOnce({
        from: () => ({ where: async () => [{ householdId: HOUSEHOLD }] }),
      });
    vi.mocked(getDb).mockReturnValue({ select } as never);
    expect(await canUserReadUpload(
      '00000000-0000-4000-8000-000000000009',
      `${USER}/2026-07-28/legacy.webp`,
    )).toBe(false);
    expect(select).toHaveBeenCalledTimes(2);
  });

  it('rejects internal references from another household and non-HTTPS external URLs', () => {
    const base = {
      householdId: HOUSEHOLD,
      userId: USER,
      publicOrigin: 'https://app.example.com',
    };
    expect(isUploadReferenceAllowed({
      ...base,
      value: `https://app.example.com/api/uploads/${OTHER_HOUSEHOLD}/${USER}/2026-07-28/victim.webp`,
    })).toBe(false);
    expect(isUploadReferenceAllowed({ ...base, value: 'http://cdn.example.com/image.png' })).toBe(false);
    expect(isUploadReferenceAllowed({ ...base, value: 'https://cdn.example.com/image.png' })).toBe(true);
  });
});
