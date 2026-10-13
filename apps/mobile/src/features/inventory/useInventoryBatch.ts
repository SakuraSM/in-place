import { useRef, useState } from 'react';
import { BatchOperationError } from '@inplace/app-core';
import { useNotify } from '@/shared/ui/ToastProvider';

interface InventoryBatchOptions {
  setSelectedIds: (ids: string[]) => void;
  refresh: () => Promise<unknown>;
}

export function useInventoryBatch({ setSelectedIds, refresh }: InventoryBatchOptions) {
  const notify = useNotify();
  const running = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const run = async ({ execute, onSuccess }: {
    execute: () => Promise<void>;
    onSuccess: () => void;
  }): Promise<void> => {
    if (running.current) return;
    running.current = true;
    setIsPending(true);
    setErrorMessage(null);
    try {
      await execute();
      onSuccess();
    } catch (error) {
      if (error instanceof BatchOperationError) setSelectedIds(error.failedIds);
      const message = error instanceof Error ? error.message : '批量操作失败，请重试';
      setErrorMessage(message);
      notify({ tone: 'error', title: '批量操作未全部完成', description: message });
    } finally {
      try {
        await refresh();
      } catch {
        notify({ tone: 'error', title: '库存刷新失败', description: '操作结果已保留，请重新加载库存。' });
      } finally {
        running.current = false;
        setIsPending(false);
      }
    }
  };

  return { run, isPending, errorMessage };
}
