import { describe, expect, it, vi } from 'vitest';
import { BatchOperationError, createItemsApi, executeBatch } from '@inplace/app-core';

describe('batch operation recovery', () => {
  it('supports a serial upload queue without stopping at the first failure', async () => {
    let active = 0;
    let peak = 0;
    const calls: string[] = [];
    const result = await executeBatch({
      entries: ['a', 'b', 'c'], identify: (id) => id, concurrency: 1,
      execute: async (id) => {
        calls.push(id);
        active += 1;
        peak = Math.max(peak, active);
        await Promise.resolve();
        active -= 1;
        if (id === 'b') throw new Error('failed');
        return id;
      },
    });
    expect(peak).toBe(1);
    expect(calls).toEqual(['a', 'b', 'c']);
    expect(result.succeeded.map((entry) => entry.id)).toEqual(['a', 'c']);
  });
  it('waits for late success and exposes only failed IDs for retry', async () => {
    let completeLateRequest: () => void = () => undefined;
    const request = vi.fn().mockImplementation(async (path: string) => {
      if (path.endsWith('/failed')) throw new Error('not allowed');
      if (path.endsWith('/late')) await new Promise<void>((resolve) => { completeLateRequest = resolve; });
    });
    const api = createItemsApi(request);
    let settled = false;
    const operation = api.deleteItemsBatch(['early', 'failed', 'late']).catch((error: unknown) => {
      settled = true;
      return error;
    });
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    expect(settled).toBe(false);
    completeLateRequest();
    const error = await operation;
    expect(error).toBeInstanceOf(BatchOperationError);
    expect(error).toMatchObject({ succeededIds: ['early', 'late'], failedIds: ['failed'] });
    request.mockResolvedValue(undefined);
    if (!(error instanceof BatchOperationError)) throw new Error('Missing batch error');
    await api.deleteItemsBatch(error.failedIds);
    expect(request.mock.calls.map(([path]) => path)).toEqual([
      '/v1/items/early', '/v1/items/failed', '/v1/items/late', '/v1/items/failed',
    ]);
  });

  it('does not submit duplicate IDs twice', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    await createItemsApi(request).deleteItemsBatch(['same', 'same']);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('retains per-draft IDs even when requests finish out of order', async () => {
    const result = await executeBatch({
      entries: ['draft-a', 'draft-b'],
      identify: (id) => id,
      execute: async (id) => {
        if (id === 'draft-b') throw new Error('upload failed');
        return { id: 'created-item-a' };
      },
    });
    expect(result.succeeded).toEqual([{ id: 'draft-a', value: { id: 'created-item-a' } }]);
    expect(result.failed.map((entry) => entry.id)).toEqual(['draft-b']);
  });
});
