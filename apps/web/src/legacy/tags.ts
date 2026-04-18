import { createTagsApi } from '@inplace/app-core';
import { apiRequest } from '../shared/api/client';

const tagsApi = createTagsApi(apiRequest);

export const {
  fetchTagsPage,
  fetchTags,
  createTag,
  updateTag,
  deleteTag,
} = tagsApi;
