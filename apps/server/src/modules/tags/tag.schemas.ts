import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().trim().min(1, '标签名称不能为空').max(80, '标签名称不能超过 80 个字符'),
  description: z.string().trim().max(2000, '标签说明不能超过 2000 个字符').default(''),
  color: z.string().trim().min(1).max(40).default('sky'),
});

export const updateTagSchema = z.object({
  name: z.string().trim().min(1, '标签名称不能为空').max(80, '标签名称不能超过 80 个字符').optional(),
  description: z.string().trim().max(2000, '标签说明不能超过 2000 个字符').optional(),
  color: z.string().trim().min(1).max(40).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: '至少需要提供一个更新字段',
});

export const tagIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listTagsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type ListTagsQuery = z.infer<typeof listTagsQuerySchema>;
