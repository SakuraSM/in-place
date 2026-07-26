import { createCodesApi, createHouseholdsApi, createLifecycleApi, createStocktakesApi } from '@inplace/app-core';
import { apiRequest } from '../../shared/api/client';

export const codesApi = createCodesApi(apiRequest);
export const householdsApi = createHouseholdsApi(apiRequest);
export const stocktakesApi = createStocktakesApi(apiRequest);
export const lifecycleApi = createLifecycleApi(apiRequest);
