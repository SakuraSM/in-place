import { createCategoriesApi } from '@inplace/app-core';
import { apiRequest } from '../shared/api/client';

const categoriesApi = createCategoriesApi(apiRequest);

export const {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = categoriesApi;
