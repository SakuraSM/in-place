import type { Database, PaginatedResult, PaginationMeta, TagEntity } from '@inplace/domain';
import type { AppCoreRequest } from './shared';

type ServerTag = {
  id: string;
  userId: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

function mapTag(tag: ServerTag): TagEntity {
  return {
    id: tag.id,
    user_id: tag.userId,
    name: tag.name,
    description: tag.description,
    color: tag.color,
    created_at: tag.createdAt,
    updated_at: tag.updatedAt,
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

export function createTagsApi(request: AppCoreRequest) {
  async function fetchTagsPage(userId: string, options: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<PaginatedResult<TagEntity>> {
    void userId;
    const searchParams = new URLSearchParams();

    if (options.page !== undefined) {
      searchParams.set('page', String(options.page));
    }

    if (options.pageSize !== undefined) {
      searchParams.set('pageSize', String(options.pageSize));
    }

    const suffix = searchParams.toString();
    const response = await request<{ data: ServerTag[]; meta?: Partial<PaginationMeta> }>(`/v1/tags${suffix ? `?${suffix}` : ''}`);
    const tags = response.data.map(mapTag);
    return {
      data: tags,
      meta: normalizePaginationMeta(response.meta, tags.length),
    };
  }

  async function fetchTags(userId: string): Promise<TagEntity[]> {
    const response = await fetchTagsPage(userId);
    return response.data;
  }

  return {
    fetchTagsPage,
    fetchTags,

    async createTag(data: Database['public']['Tables']['tags']['Insert']): Promise<TagEntity> {
      const response = await request<{ data: ServerTag }>('/v1/tags', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          color: data.color,
        }),
      });

      return mapTag(response.data);
    },

    async updateTag(id: string, data: Database['public']['Tables']['tags']['Update']): Promise<TagEntity> {
      const response = await request<{ data: ServerTag }>(`/v1/tags/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.color !== undefined ? { color: data.color } : {}),
        }),
      });

      return mapTag(response.data);
    },

    async deleteTag(id: string): Promise<void> {
      await request<void>(`/v1/tags/${id}`, {
        method: 'DELETE',
      });
    },
  };
}
