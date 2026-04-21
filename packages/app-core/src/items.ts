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

const COMPRESSIBLE_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const CLIENT_UPLOAD_TARGET_BYTES = 8 * 1024 * 1024;
const CLIENT_UPLOAD_COMPRESS_THRESHOLD_BYTES = 4 * 1024 * 1024;
const CLIENT_UPLOAD_MAX_EDGE = 2560;
const CLIENT_UPLOAD_QUALITY_STEPS = [0.82, 0.76, 0.7];

function canCompressInBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function replaceFileExtension(filename: string, extension: string) {
  const baseName = filename.replace(/\.[^.]+$/, '');
  return `${baseName || 'image'}${extension}`;
}

async function loadImageElement(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('图片解析失败'));
      element.src = objectUrl;
    });

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw(canvas: HTMLCanvasElement) {
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('图片压缩失败');
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      },
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadImageSource(file: File) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw(canvas: HTMLCanvasElement) {
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('图片压缩失败');
        }

        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      },
      dispose() {
        bitmap.close();
      },
    };
  }

  const image = await loadImageElement(file);
  return {
    ...image,
    dispose() {
      // no-op fallback for HTMLImageElement
    },
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('图片压缩失败'));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
}

async function prepareUploadImage(file: File) {
  if (!canCompressInBrowser() || !COMPRESSIBLE_IMAGE_TYPES.has(file.type)) {
    return file;
  }

  if (file.size <= CLIENT_UPLOAD_COMPRESS_THRESHOLD_BYTES) {
    return file;
  }

  const source = await loadImageSource(file);

  try {
    const scale = Math.min(1, CLIENT_UPLOAD_MAX_EDGE / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    source.draw(canvas);

    let bestBlob = await canvasToBlob(canvas, 'image/webp', CLIENT_UPLOAD_QUALITY_STEPS[0]);
    for (const quality of CLIENT_UPLOAD_QUALITY_STEPS.slice(1)) {
      if (bestBlob.size <= CLIENT_UPLOAD_TARGET_BYTES) {
        break;
      }

      bestBlob = await canvasToBlob(canvas, 'image/webp', quality);
    }

    if (bestBlob.size >= file.size) {
      return file;
    }

    return new File(
      [bestBlob],
      replaceFileExtension(file.name, '.webp'),
      { type: 'image/webp', lastModified: file.lastModified },
    );
  } catch {
    return file;
  } finally {
    source.dispose();
  }
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
    locationId?: string | null;
    locationOnly?: boolean;
    tags?: string[];
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

    if (options.locationId) {
      searchParams.set('locationId', options.locationId);
    }

    if (options.locationOnly) {
      searchParams.set('locationOnly', 'true');
    }

    if (options.tags && options.tags.length > 0) {
      options.tags.forEach((tag) => searchParams.append('tags', tag));
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
    locationId?: string | null;
    locationOnly?: boolean;
    tags?: string[];
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
    const uploadFile = await prepareUploadImage(file);
    const formData = new FormData();
    formData.append('file', uploadFile);

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
