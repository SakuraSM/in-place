import { z } from 'zod';

export const listActivityLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type ListActivityLogsQuery = z.infer<typeof listActivityLogsQuerySchema>;
