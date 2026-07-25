import { useCallback, useEffect, useState } from 'react';
import type { Category, Item } from '../../../legacy/database.types';
import { fetchCategories } from '../../../legacy/categories';
import { fetchAncestors, fetchChildren } from '../../../legacy/items';

export function useHomeInventoryData(
  userId: string | null,
  currentParentId: string | null,
) {
  const [breadcrumbs, setBreadcrumbs] = useState<Item[]>([]);
  const [children, setChildren] = useState<Item[]>([]);
  const [childCounts, setChildCounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChildren = useCallback(async (parentId: string | null) => {
    if (!userId) {
      return;
    }
    setLoading(true);
    try {
      const items = await fetchChildren(parentId, userId);
      setChildren(items);
      const counts: Record<string, number> = {};
      await Promise.all(items
        .filter((item) => item.type === 'container')
        .map(async (container) => {
          const nestedItems = await fetchChildren(container.id, userId);
          counts[container.id] = nestedItems.length;
        }));
      setChildCounts(counts);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadChildren(currentParentId);
  }, [currentParentId, loadChildren]);

  useEffect(() => {
    let active = true;
    if (!userId) {
      return undefined;
    }
    if (!currentParentId) {
      setBreadcrumbs([]);
      return undefined;
    }

    void fetchAncestors(currentParentId).then((items) => {
      if (active) {
        setBreadcrumbs(items);
      }
    });

    return () => {
      active = false;
    };
  }, [currentParentId, userId]);

  useEffect(() => {
    if (userId) {
      void fetchCategories(userId).then(setCategories);
    }
  }, [userId]);

  return {
    breadcrumbs,
    children,
    childCounts,
    categories,
    loading,
    loadChildren,
  };
}
