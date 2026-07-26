import { z } from 'zod';

const optionalDateTime = z.string().datetime().nullable().optional().transform((value) => (
  value ? new Date(value) : null
));

export const itemLifecycleParamsSchema = z.object({
  itemId: z.string().uuid(),
});

export const entityIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createLoanSchema = z.object({
  itemId: z.string().uuid(),
  borrowerUserId: z.string().uuid().nullable().optional(),
  borrowerName: z.string().trim().min(1).max(120),
  dueAt: optionalDateTime,
  notes: z.string().max(4000).optional().default(''),
});

export const createAttachmentSchema = z.object({
  kind: z.enum(['receipt', 'manual', 'warranty', 'other']).default('other'),
  name: z.string().trim().min(1).max(255),
  fileUrl: z.string().url(),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.coerce.number().int().min(0),
});

export const createMaintenanceSchema = z.object({
  title: z.string().trim().min(1).max(160),
  notes: z.string().max(4000).optional().default(''),
  cost: z.coerce.number().min(0).nullable().optional(),
  provider: z.string().trim().max(160).nullable().optional(),
  performedAt: z.string().datetime().transform((value) => new Date(value)),
  nextDueAt: optionalDateTime,
});

export const updateReminderSchema = z.object({
  status: z.enum(['unread', 'read', 'dismissed']),
});

export const createInventoryBatchSchema = z.object({
  quantity: z.coerce.number().int().positive(),
  expiryDate: z.string().date().nullable().optional(),
  notes: z.string().max(2000).optional().default(''),
});
