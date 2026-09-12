import { act, renderHook } from '@testing-library/react-native';
import { BatchOperationError } from '@inplace/app-core';
import { useInventoryBatch } from '../useInventoryBatch';

const mockNotify = jest.fn();
jest.mock('@/shared/ui/ToastProvider', () => ({ useNotify: () => mockNotify }));

describe('inventory batch controller', () => {
  it('retains failures, refreshes partial changes and does not report full success', async () => {
    const setSelectedIds = jest.fn();
    const refresh = jest.fn(async () => undefined);
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useInventoryBatch({ setSelectedIds, refresh }));
    await act(async () => result.current.run({
      execute: async () => { throw new BatchOperationError({
        succeeded: [{ id: 'saved', value: undefined }], failed: [{ id: 'failed', error: new Error('被拒绝') }],
      }); },
      onSuccess,
    }));
    expect(setSelectedIds).toHaveBeenCalledWith(['failed']);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result.current.errorMessage).toContain('已完成 1 项，1 项失败');
    expect(result.current.isPending).toBe(false);
  });

  it('prevents a second submission before the first one settles', async () => {
    let finish: () => void = () => undefined;
    const execute = jest.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useInventoryBatch({ setSelectedIds: jest.fn(), refresh: async () => undefined }));
    await act(async () => {
      const first = result.current.run({ execute, onSuccess });
      await result.current.run({ execute, onSuccess });
      expect(execute).toHaveBeenCalledTimes(1);
      finish();
      await first;
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
