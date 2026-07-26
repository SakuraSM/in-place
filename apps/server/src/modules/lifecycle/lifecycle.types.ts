import type { z } from 'zod';
import type {
  createAttachmentSchema,
  createInventoryBatchSchema,
  createLoanSchema,
  createMaintenanceSchema,
} from './lifecycle.schemas.js';

interface HouseholdCommandContext {
  householdId: string;
  userId: string;
}

export type CreateLoanInput = HouseholdCommandContext & z.infer<typeof createLoanSchema>;
export type CreateAttachmentInput = HouseholdCommandContext
  & { itemId: string }
  & z.infer<typeof createAttachmentSchema>;
export type CreateMaintenanceInput = HouseholdCommandContext
  & { itemId: string }
  & z.infer<typeof createMaintenanceSchema>;
export type CreateInventoryBatchInput = Pick<HouseholdCommandContext, 'householdId'>
  & { itemId: string }
  & z.infer<typeof createInventoryBatchSchema>;
