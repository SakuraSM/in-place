import { useCallback, useEffect, useState } from 'react';
import type { Category, CategoryScope } from '../../../legacy/database.types';
import { fetchCategories } from '../../../legacy/categories';

type CategoryLoadState =
  | { userId: string; scope: CategoryScope; status: 'loading' }
  | { userId: string; scope: CategoryScope; status: 'ready'; categories: Category[] }
  | { userId: string; scope: CategoryScope; status: 'error' };

interface ItemFormCategories {
  categories: Category[];
  isLoading: boolean;
  hasError: boolean;
  retry: () => void;
}

export function useItemFormCategories(userId: string | undefined, scope: CategoryScope): ItemFormCategories {
  const [state, setState] = useState<CategoryLoadState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    if (!userId) return undefined;
    let isCancelled = false;
    setState({ userId, scope, status: 'loading' });
    void fetchCategories(userId, scope).then(
      (categories) => {
        if (!isCancelled) setState({ userId, scope, status: 'ready', categories });
      },
      () => {
        if (!isCancelled) setState({ userId, scope, status: 'error' });
      },
    );
    return () => { isCancelled = true; };
  }, [userId, scope, attempt]);

  const currentState = state && state.userId === userId && state.scope === scope ? state : null;
  return {
    categories: currentState?.status === 'ready' ? currentState.categories : [],
    isLoading: currentState === null || currentState.status === 'loading',
    hasError: currentState?.status === 'error',
    retry,
  };
}
