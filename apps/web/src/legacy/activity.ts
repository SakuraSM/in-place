import { createActivityApi } from '@inplace/app-core';
import { apiRequest } from '../shared/api/client';

const activityApi = createActivityApi(apiRequest);

export const {
  fetchActivityLogsPage,
} = activityApi;
