import { z } from 'zod';

export const householdRoleSchema = z.enum(['owner', 'editor', 'viewer']);

export const createHouseholdSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const householdIdParamsSchema = z.object({
  householdId: z.string().uuid(),
});

export const householdMemberParamsSchema = householdIdParamsSchema.extend({
  memberId: z.string().uuid(),
});

export const householdInviteParamsSchema = householdIdParamsSchema.extend({
  inviteId: z.string().uuid(),
});

export const createHouseholdInviteSchema = z.object({
  role: householdRoleSchema.exclude(['owner']).default('viewer'),
});

export const acceptHouseholdInviteParamsSchema = z.object({
  token: z.string().min(20).max(160),
});

export const updateHouseholdMemberSchema = z.object({
  role: householdRoleSchema.exclude(['owner']),
});

export type HouseholdRole = z.infer<typeof householdRoleSchema>;
