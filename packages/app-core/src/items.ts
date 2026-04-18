import { ApiError } from '@inplace/api-client';
import type { Item, ItemStats, PaginatedResult, PaginationMeta } from '@inplace/domain';
import type { AppCoreRequest } from './shared';

type ServerItem = {
  id: string;
  userId: string;
  parentId: string | null;
  type: Item['type'];
  name: string;
  description: string;
  category: string;
  price: string | number | null;
  quantity: number;
  purchaseDate: string | null;
  warrantyDate: string | null;
  status: Item['status'];
  images: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

function mapItem(item: ServerItem): Item {
  return {
    id: item.id,
    user_id: item.userId,
    parent_id: item.parentId,
    type: item.type,
    name: item.name,
    description: item.description,
    category: item.category,
    price: item.price === null ? null : Number(item.price),
    purchase_date: item.purchaseDate,
    warranty_date: item.warrantyDate,
    status: item.status,
    images: item.images,
    tags: item.tags,
    metadata: item.metadata,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function toServerPayload(data: Partial<Item>) {
  return {
    ...(data.parent_id !== undefined ? { parentId: data.parent_id } : {}),
    ...(data.type !== undefined ? { type: data.type } : {}),
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.category !== undefined ? { category: data.category } : {}),
    ...(data.price !== undefined ? { price: data.price } : {}),
    ...(data.purchase_date !== undefined ? { purchaseDate: data.purchase_date } : {}),
    ...(data.warranty_date !== undefined ? { warrantyDate: data.warranty_date } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.images !== undefined ? { images: data.images } : {}),
    ...(data.tags !== undefined ? { tags: data.tags } : {}),
    ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
  };
}

function normalizePaginationMeta(meta: Partial<PaginationMeta> | undefined, fallbackCount: number): PaginationMeta {
  return {
    page: meta?.page ?? 1,
    pageSize: meta?.pageSize ?? fallbackCount,
    total: meta?.total ?? fallbackCount,
    totalPages: meta?.totalPages ?? 1,
    hasNextPage: meta?.hasNextPage ?? false,
  };
}

export function createItemsApi(request: AppCoreRequest) {
  async function fetchChildrenPage(parentId: string | null, userId: string, options: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<PaginatedResult<Item>> {
    void userId;
    const searchParams = new URLSearchParams();
    if (parentId) {
      searchParams.set('parentId', parentId);
    } else {
      searchParams.set('rootOnly', 'true');
    }

    if (options.page !== undefined) {
      searchParams.set('page', String(options.page));
    }

    if (options.pageSize !== undefined) {
      searchParams.set('pageSize', String(options.pageSize));
    }

    const response = await request<{ data: ServerItem[]; meta?: Partial<PaginationMeta> }>(`/v1/items?${searchParams.toString()}`);
    const items = response.data.map(mapItem);
    return {
      data: items,
      meta: normalizePaginationMeta(response.meta, items.length),
    };
  }

  async function fetchChildren(parentId: string | null, userId: string): Promise<Item[]> {
    const response = await fetchChildrenPage(parentId, userId);
    return response.data;
  }

  async function fetchItem(id: string): Promise<Item | null> {
    try {
      const response = await request<{ data: ServerItem }>(`/v1/items/${id}`);
      return mapItem(response.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }

      throw error;
    }
  }

  async function fetchAncestors(id: string): Promise<Item[]> {
    const ancestors: Item[] = [];
    let currentId: string | null = id;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const item = await fetchItem(currentId);
      if (!item) break;
      ancestors.unshift(item);
      currentId = item.parent_id;
    }

    return ancestors;
  }

  async function createItem(data: Omit<Item, 'id' | 'created_at' | 'updated_at'>): Promise<Item> {
    const response = await request<{ data: ServerItem }>('/v1/items', {
      method: 'POST',
      body: JSON.stringify(toServerPayload(data)),
    });
    return mapItem(response.data);
  }

  async function updateItem(id: string, data: Partial<Item>): Promise<Item> {
    const response = await request<{ data: ServerItem }>(`/v1/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(toServerPayload(data)),
    });
    return mapItem(response.data);
  }

  async function deleteItem(id: string): Promise<void> {
    await request<void>(`/v1/items/${id}`, {
      method: 'DELETE',
    });
  }

  async function updateItemsBatch(ids: string[], data: Partial<Item>): Promise<void> {
    await Promise.all(ids.map((id) => updateItem(id, data)));
  }

  async function deleteItemsBatch(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => deleteItem(id)));
  }

  async function searchItemsPage(query: string, userId: string, options: {
    page?: number;
    pageSize?: number;
    type?: Item['type'];
    status?: Item['status'];
  } = {}): Promise<PaginatedResult<Item>> {
    void userId;
    const searchParams = new URLSearchParams();
    if (query.trim()) {
      searchParams.set('query', query.trim());
    }

    if (options.page !== undefined) {
      searchParams.set('page', String(options.page));
    }

    if (options.pageSize !== undefined) {
      searchParams.set('pageSize', String(options.pageSize));
    }

    if (options.type !== undefined) {
      searchParams.set('type', options.type);
    }

    if (options.status !== undefined) {
      searchParams.set('status', options.status);
    }

    const suffix = searchParams.toString();
    const response = await request<{ data: ServerItem[]; meta?: Partial<PaginationMeta> }>(`/v1/items${suffix ? `?${suffix}` : ''}`);
    const items = response.data.map(mapItem);
    return {
      data: items,
      meta: normalizePaginationMeta(response.meta, items.length),
    };
  }

  async function searchItems(query: string, userId: string, options: {
    type?: Item['type'];
    status?: Item['status'];
  } = {}): Promise<Item[]> {
    const response = await searchItemsPage(query, userId, options);
    return response.data;
  }

  async function fetchItemStats(userId: string): Promise<ItemStats> {
    void userId;
    const response = await request<{ data: ItemStats }>('/v1/items/stats');
    return response.data;
  }

  async function uploadImage(file: File, userId: string): Promise<string> {
    void userId;
    const formData = new FormData();
    formData.append('file', file);

    const response = await request<{ url: string }>('/v1/uploads/images', {
      method: 'POST',
      body: formData,
    });

    return response.url;
  }

  return {
    fetchChildrenPage,
    fetchChildren,
    fetchItem,
    fetchAncestors,
    createItem,
    updateItem,
    deleteItem,
    updateItemsBatch,
    deleteItemsBatch,
    searchItemsPage,
    searchItems,
    fetchItemStats,
    uploadImage,
  };
}
