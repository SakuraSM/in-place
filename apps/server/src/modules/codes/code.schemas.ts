import { z } from 'zod';

export const codeParamsSchema = z.object({
  code: z.string().trim().min(16).max(64),
});

export const createCodeBatchSchema = z.object({
  count: z.coerce.number().int().min(1).max(100).default(30),
});

export const bindCodeSchema = z.object({
  itemId: z.string().uuid(),
});
