import { z } from 'zod';

export const createStocktakeSchema = z.object({
  locationId: z.string().uuid(),
});

export const stocktakeIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const updateStocktakeEntrySchema = z.object({
  itemId: z.string().uuid(),
  countedQuantity: z.coerce.number().int().min(0),
  foundParentId: z.string().uuid().nullable().optional(),
});

export const completeStocktakeSchema = z.object({
  reconcileMoves: z.boolean().default(false),
  reconcileQuantities: z.boolean().default(false),
});
