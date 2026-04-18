import { createItemsApi } from '@inplace/app-core';
import { apiRequest } from '../shared/api/client';

const itemsApi = createItemsApi(apiRequest);

export const {
  fetchChildrenPage,
  fetchChildren,
  fetchItem,
  fetchAncestors,
  fetchItemStats,
  createItem,
  updateItem,
  deleteItem,
  updateItemsBatch,
  deleteItemsBatch,
  searchItemsPage,
  searchItems,
  uploadImage,
} = itemsApi;
