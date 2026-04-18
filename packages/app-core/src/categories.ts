import type { Category, ItemType } from '@inplace/domain';
import type { AppCoreRequest } from './shared';

type ServerCategory = {
  id: string;
  userId: string;
  itemType: ItemType;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
};

function mapCategory(category: ServerCategory): Category {
  return {
    id: category.id,
    user_id: category.userId,
    item_type: category.itemType,
    name: category.name,
    icon: category.icon,
    color: category.color,
    created_at: category.createdAt,
  };
}

export function createCategoriesApi(request: AppCoreRequest) {
  return {
    async fetchCategories(userId: string, itemType?: ItemType): Promise<Category[]> {
      void userId;
      const search = itemType ? `?itemType=${itemType}` : '';
      const response = await request<{ data: ServerCategory[] }>(`/v1/categories${search}`);
      return response.data.map(mapCategory);
    },

    async createCategory(data: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
      const response = await request<{ data: ServerCategory }>('/v1/categories', {
        method: 'POST',
        body: JSON.stringify({
          itemType: data.item_type,
          name: data.name,
          icon: data.icon,
          color: data.color,
        }),
      });
      return mapCategory(response.data);
    },

    async updateCategory(id: string, data: Partial<Omit<Category, 'id' | 'user_id' | 'created_at'>>): Promise<Category> {
      const response = await request<{ data: ServerCategory }>(`/v1/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(data.item_type !== undefined ? { itemType: data.item_type } : {}),
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.icon !== undefined ? { icon: data.icon } : {}),
          ...(data.color !== undefined ? { color: data.color } : {}),
        }),
      });
      return mapCategory(response.data);
    },

    async deleteCategory(id: string): Promise<void> {
      await request<void>(`/v1/categories/${id}`, {
        method: 'DELETE',
      });
    },
  };
}
