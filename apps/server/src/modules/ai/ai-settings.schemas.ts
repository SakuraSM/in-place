import { z } from 'zod';

export const updateAiSettingsSchema = z.object({
  apiKey: z.string().trim().min(1).optional(),
  baseUrl: z.string().trim().optional(),
  model: z.string().trim().optional(),
});

export type UpdateAiSettingsInput = z.infer<typeof updateAiSettingsSchema>;
