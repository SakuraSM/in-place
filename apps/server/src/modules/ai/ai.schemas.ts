import { itemTypeSchema } from '../items/item.schemas.js';
import { z } from 'zod';

export const aiBoundingBoxSchema = z.object({
  x: z.number().finite().min(0).max(1000),
  y: z.number().finite().min(0).max(1000),
  width: z.number().finite().min(1).max(1000),
  height: z.number().finite().min(1).max(1000),
});

export const aiRecognitionResultSchema = z.object({
  type: itemTypeSchema.default('item'),
  name: z.string().trim().min(1, '物品名称不能为空'),
  category: z.string().trim().min(1, '物品类别不能为空'),
  brand: z.string().trim().optional(),
  description: z.string().trim().min(1, '物品描述不能为空'),
  tags: z.array(z.string().trim().min(1)).default([]),
  price: z.number().finite().nonnegative().optional(),
  boundingBox: aiBoundingBoxSchema.optional(),
});

export const aiRecognitionResultsSchema = z.array(aiRecognitionResultSchema);

export type AiRecognitionResult = z.infer<typeof aiRecognitionResultSchema>;
