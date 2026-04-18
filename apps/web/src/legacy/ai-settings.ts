import { createAiApi } from '@inplace/app-core';
export type { AiSettings, UpdateAiSettingsInput } from '@inplace/domain';
import { apiRequest } from '../shared/api/client';

const aiApi = createAiApi(apiRequest);

export const {
  fetchAiSettings,
  updateAiSettings,
  resetAiSettings,
} = aiApi;
