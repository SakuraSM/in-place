import type { InventoryCode, Item } from '@inplace/domain';
import type { AppCoreRequest } from './shared';
import { mapServerItem, type ServerItem } from './items';

interface ServerInventoryCode {
  id: string;
  householdId: string;
  itemId: string | null;
  code: string;
  createdByUserId: string;
  boundAt: string | null;
  createdAt: string;
}

function mapCode(record: ServerInventoryCode): InventoryCode {
  return {
    id: record.id,
    household_id: record.householdId,
    item_id: record.itemId,
    code: record.code,
    created_by_user_id: record.createdByUserId,
    bound_at: record.boundAt,
    created_at: record.createdAt,
  };
}

export function createCodesApi(request: AppCoreRequest) {
  return {
    async createBatch(count = 30): Promise<InventoryCode[]> {
      const response = await request<{ data: ServerInventoryCode[] }>('/v1/codes/batches', {
        method: 'POST',
        body: JSON.stringify({ count }),
      });
      return response.data.map(mapCode);
    },

    async resolveCode(code: string): Promise<{
      code: InventoryCode;
      item: Item | null;
      entityKind: 'location' | 'container' | 'item' | null;
    }> {
      const response = await request<{
        data: ServerInventoryCode & {
          item: ServerItem | null;
          entityKind: 'location' | 'container' | 'item' | null;
        };
      }>(`/v1/codes/${encodeURIComponent(code)}`);
      return {
        code: mapCode(response.data),
        item: response.data.item ? mapServerItem(response.data.item) : null,
        entityKind: response.data.entityKind,
      };
    },

    async bindCode(code: string, itemId: string): Promise<InventoryCode> {
      const response = await request<{ data: ServerInventoryCode }>(`/v1/codes/${encodeURIComponent(code)}/bind`, {
        method: 'POST',
        body: JSON.stringify({ itemId }),
      });
      return mapCode(response.data);
    },
  };
}
