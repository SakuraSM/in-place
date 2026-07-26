import type { StocktakeEntry, StocktakeSession } from '@inplace/domain';
import type { AppCoreRequest } from './shared';
import { mapServerItem, type ServerItem } from './items';

interface ServerStocktakeEntry {
  id: string;
  stocktakeId: string;
  itemId: string;
  item: ServerItem;
  expectedParentId: string | null;
  foundParentId: string | null;
  expectedQuantity: number;
  countedQuantity: number | null;
  status: StocktakeEntry['status'];
  updatedAt: string;
}

interface ServerStocktakeSession {
  id: string;
  householdId: string;
  locationId: string;
  location: ServerItem;
  status: StocktakeSession['status'];
  createdByUserId: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  entries?: ServerStocktakeEntry[];
}

function mapStocktake(session: ServerStocktakeSession): StocktakeSession {
  return {
    id: session.id,
    household_id: session.householdId,
    location_id: session.locationId,
    location: mapServerItem(session.location),
    status: session.status,
    created_by_user_id: session.createdByUserId,
    completed_at: session.completedAt,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
    entries: (session.entries ?? []).map((entry) => ({
      id: entry.id,
      stocktake_id: entry.stocktakeId,
      item_id: entry.itemId,
      item: mapServerItem(entry.item),
      expected_parent_id: entry.expectedParentId,
      found_parent_id: entry.foundParentId,
      expected_quantity: entry.expectedQuantity,
      counted_quantity: entry.countedQuantity,
      status: entry.status,
      updated_at: entry.updatedAt,
    })),
  };
}

export function createStocktakesApi(request: AppCoreRequest) {
  return {
    async listRecent(): Promise<StocktakeSession[]> {
      const response = await request<{ data: ServerStocktakeSession[] }>('/v1/stocktakes');
      return response.data.map(mapStocktake);
    },

    async create(locationId: string): Promise<StocktakeSession> {
      const response = await request<{ data: ServerStocktakeSession }>('/v1/stocktakes', {
        method: 'POST',
        body: JSON.stringify({ locationId }),
      });
      return mapStocktake(response.data);
    },

    async fetch(stocktakeId: string): Promise<StocktakeSession> {
      const response = await request<{ data: ServerStocktakeSession }>(`/v1/stocktakes/${stocktakeId}`);
      return mapStocktake(response.data);
    },

    async countItem(input: {
      stocktakeId: string;
      itemId: string;
      countedQuantity: number;
      foundParentId?: string | null;
    }): Promise<void> {
      await request(`/v1/stocktakes/${input.stocktakeId}/entries`, {
        method: 'PATCH',
        body: JSON.stringify({
          itemId: input.itemId,
          countedQuantity: input.countedQuantity,
          foundParentId: input.foundParentId,
        }),
      });
    },

    async complete(input: {
      stocktakeId: string;
      reconcileMoves: boolean;
      reconcileQuantities: boolean;
    }): Promise<StocktakeSession> {
      const response = await request<{ data: ServerStocktakeSession }>(`/v1/stocktakes/${input.stocktakeId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          reconcileMoves: input.reconcileMoves,
          reconcileQuantities: input.reconcileQuantities,
        }),
      });
      return mapStocktake(response.data);
    },
  };
}
