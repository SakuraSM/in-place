export interface BatchFailure {
  id: string;
  error: unknown;
}

export interface BatchResult<TResult> {
  succeeded: Array<{ id: string; value: TResult }>;
  failed: BatchFailure[];
}

export class BatchOperationError extends Error {
  readonly succeededIds: string[];
  readonly failedIds: string[];

  constructor(result: BatchResult<unknown>) {
    const firstError = result.failed[0]?.error;
    const detail = firstError instanceof Error ? `：${firstError.message}` : '';
    super(`已完成 ${result.succeeded.length} 项，${result.failed.length} 项失败，请仅重试失败项${detail}`);
    this.name = 'BatchOperationError';
    this.succeededIds = result.succeeded.map((entry) => entry.id);
    this.failedIds = result.failed.map((entry) => entry.id);
  }
}

/** Resolves only after every request settles, including failures and late successes. */
export async function executeBatch<TEntry, TResult>({
  entries,
  identify,
  execute,
  concurrency = entries.length,
}: {
  entries: readonly TEntry[];
  identify: (entry: TEntry) => string;
  execute: (entry: TEntry) => Promise<TResult>;
  concurrency?: number;
}): Promise<BatchResult<TResult>> {
  if (!Number.isInteger(concurrency) || concurrency < 0) throw new Error('批量并发数必须为非负整数');
  const outcomes: PromiseSettledResult<TResult>[] = new Array(entries.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < entries.length) {
      const index = nextIndex++;
      try {
        outcomes[index] = { status: 'fulfilled', value: await execute(entries[index]) };
      } catch (error) {
        outcomes[index] = { status: 'rejected', reason: error };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(entries.length, Math.max(1, concurrency)) }, worker));
  const result: BatchResult<TResult> = { succeeded: [], failed: [] };
  outcomes.forEach((outcome, index) => {
    const id = identify(entries[index]);
    if (outcome.status === 'fulfilled') {
      result.succeeded.push({ id, value: outcome.value });
    } else {
      result.failed.push({ id, error: outcome.reason });
    }
  });
  return result;
}
