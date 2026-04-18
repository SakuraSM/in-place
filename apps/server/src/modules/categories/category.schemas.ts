import { z } from 'zod';

export const categoryItemTypeSchema = z.enum(['container', 'item']);

export const listCategoriesQuerySchema = z.object({
  itemType: categoryItemTypeSchema.optional(),
});

export const createCategorySchema = z.object({
  itemType: categoryItemTypeSchema.default('item'),
  name: z.string().trim().min(1).max(120),
  icon: z.string().trim().min(1).max(255).default('FolderTree'),
  color: z.string().trim().min(1).max(40).default('slate'),
});

export const updateCategorySchema = z.object({
  itemType: categoryItemTypeSchema.optional(),
  name: z.string().trim().min(1).max(120).optional(),
  icon: z.string().trim().min(1).max(255).optional(),
  color: z.string().trim().min(1).max(40).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: '至少需要提供一个更新字段',
});

export const categoryIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
