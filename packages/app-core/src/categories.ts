import type { Category, CategoryScope, ItemType } from '@inplace/domain';
import type { AppCoreRequest } from './shared';

type ServerCategory = {
  id: string;
  userId: string;
  householdId: string;
  itemType: ItemType;
  scope: CategoryScope;
  presetKey: string | null;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
};

function mapCategory(category: ServerCategory): Category {
  return {
    id: category.id,
    user_id: category.userId,
    household_id: category.householdId,
    item_type: category.itemType,
    scope: category.scope,
    preset_key: category.presetKey,
    name: category.name,
    icon: category.icon,
    color: category.color,
    created_at: category.createdAt,
  };
}

export function createCategoriesApi(request: AppCoreRequest) {
  return {
    async fetchCategories(userId: string, scope?: CategoryScope): Promise<Category[]> {
      void userId;
      const search = scope ? `?scope=${scope}` : '';
      const response = await request<{ data: ServerCategory[] }>(`/v1/categories${search}`);
      return response.data.map(mapCategory);
    },

    async createCategory(data: Pick<Category, 'user_id' | 'scope' | 'name' | 'icon' | 'color'>): Promise<Category> {
      const response = await request<{ data: ServerCategory }>('/v1/categories', {
        method: 'POST',
        body: JSON.stringify({
          scope: data.scope,
          name: data.name,
          icon: data.icon,
          color: data.color,
        }),
      });
      return mapCategory(response.data);
    },

    async updateCategory(
      id: string,
      data: Partial<Pick<Category, 'name' | 'icon' | 'color'>>,
    ): Promise<Category> {
      const response = await request<{ data: ServerCategory }>(`/v1/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
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

    async fetchCategoryPresets(): Promise<{
      total: number;
      missingCount: number;
      dismissedCount: number;
    }> {
      return request('/v1/categories/presets');
    },

    async applyCategoryPresets(): Promise<{
      addedCount: number;
      skippedCount: number;
      data: Category[];
    }> {
      const response = await request<{
        addedCount: number;
        skippedCount: number;
        data: ServerCategory[];
      }>('/v1/categories/presets/apply', { method: 'POST' });
      return {
        ...response,
        data: response.data.map(mapCategory),
      };
    },
  };
}
