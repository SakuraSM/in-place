import { describe, expect, it, vi } from 'vitest';
import { getDb } from '../../lib/db.js';
import { rotatePasswordAuthSession } from './auth-session.repository.js';

vi.mock('../../lib/db.js', () => ({
  getDb: vi.fn(),
}));

describe('password session rotation transaction', () => {
  it('updates the password, revokes sessions, and inserts the replacement in one transaction', async () => {
    const operations: string[] = [];
    const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      update: vi.fn()
        .mockReturnValueOnce({
          set: () => ({
            where: () => ({
              returning: async () => {
                operations.push('password');
                return [{ id: '00000000-0000-4000-8000-000000000001' }];
              },
            }),
          }),
        })
        .mockReturnValueOnce({
          set: () => ({
            where: async () => {
              operations.push('revoke');
            },
          }),
        }),
      insert: () => ({
        values: () => ({
          returning: async () => {
            operations.push('session');
            return [{ id: '00000000-0000-4000-8000-000000000010' }];
          },
        }),
      }),
    }));
    vi.mocked(getDb).mockReturnValue({ transaction } as never);

    const session = await rotatePasswordAuthSession({
      userId: '00000000-0000-4000-8000-000000000001',
      passwordHash: 'new-hash',
      ttlDays: 7,
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(operations).toEqual(['password', 'revoke', 'session']);
    expect(session.id).toBe('00000000-0000-4000-8000-000000000010');
  });
});
