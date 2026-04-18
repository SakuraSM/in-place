import { z } from 'zod';

export const itemTypeSchema = z.enum(['container', 'item']);
export const itemStatusSchema = z.enum(['in_stock', 'borrowed', 'worn_out']);

const nullableDateSchema = z.union([z.string(), z.date()]).nullable().optional().transform((value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
});

export const listItemsQuerySchema = z.object({
  parentId: z.string().uuid().optional(),
  rootOnly: z.coerce.boolean().optional(),
  query: z.string().trim().optional(),
  type: itemTypeSchema.optional(),
  status: itemStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const exportItemsQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
});

const importCategorySchema = z.object({
  id: z.string().uuid(),
  item_type: itemTypeSchema,
  name: z.string().trim().min(1).max(120),
  icon: z.string().trim().min(1).max(80),
  color: z.string().trim().min(1).max(40),
  created_at: z.string().datetime(),
});

const importTagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  description: z.string().max(2000),
  color: z.string().trim().min(1).max(40),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const importItemSchema = z.object({
  id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  type: itemTypeSchema,
  name: z.string().trim().min(1).max(160),
  description: z.string().max(10000),
  category: z.string().trim().max(120),
  quantity: z.coerce.number().int().positive(),
  price: z.union([z.string(), z.number()]).nullable(),
  purchase_date: z.string().datetime().nullable(),
  warranty_date: z.string().datetime().nullable(),
  status: itemStatusSchema,
  images: z.array(z.string().url()),
  tags: z.array(z.string().trim().min(1).max(80)),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const importInventorySchema = z.object({
  version: z.union([z.literal('1'), z.literal('2')]),
  exported_at: z.string().datetime(),
  categories: z.array(importCategorySchema),
  tags: z.array(importTagSchema),
  items: z.array(importItemSchema),
  image_assets: z.record(z.string(), z.object({
    filename: z.string().min(1),
    mime_type: z.string().min(1),
    data_base64: z.string().min(1),
  })).optional(),
});

export const createItemSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  type: itemTypeSchema.default('item'),
  name: z.string().trim().min(1).max(160),
  description: z.string().max(10000).optional().default(''),
  category: z.string().trim().max(120).optional().default(''),
  price: z.union([z.string(), z.number()]).nullable().optional(),
  quantity: z.coerce.number().int().positive().optional().default(1),
  purchaseDate: nullableDateSchema,
  warrantyDate: nullableDateSchema,
  status: itemStatusSchema.optional().default('in_stock'),
  images: z.array(z.string().url()).optional().default([]),
  tags: z.array(z.string().trim().min(1).max(80)).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateItemSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  type: itemTypeSchema.optional(),
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().max(10000).optional(),
  category: z.string().trim().max(120).optional(),
  price: z.union([z.string(), z.number()]).nullable().optional(),
  quantity: z.coerce.number().int().positive().optional(),
  purchaseDate: nullableDateSchema,
  warrantyDate: nullableDateSchema,
  status: itemStatusSchema.optional(),
  images: z.array(z.string().url()).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: '至少需要提供一个更新字段',
});

export const itemIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;
export type ExportItemsQuery = z.infer<typeof exportItemsQuerySchema>;
export type ImportInventoryInput = z.infer<typeof importInventorySchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
