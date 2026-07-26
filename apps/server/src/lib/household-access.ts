import type { FastifyReply, FastifyRequest } from 'fastify';
import { findHouseholdAccess } from '../modules/households/household.repository.js';
import type { HouseholdRole } from '../modules/households/household.schemas.js';
import { requireCurrentUser } from './authenticated-request.js';

const HOUSEHOLD_HEADER = 'x-inplace-household-id';
const ROLE_LEVEL: Record<HouseholdRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export function householdRoleMeetsMinimum(role: HouseholdRole, minimumRole: HouseholdRole) {
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minimumRole];
}

export interface HouseholdAccess {
  householdId: string;
  householdName: string;
  role: HouseholdRole;
  userId: string;
}

export async function requireHouseholdAccess(input: {
  request: FastifyRequest;
  reply: FastifyReply;
  minimumRole?: HouseholdRole;
}): Promise<HouseholdAccess | null> {
  const currentUser = requireCurrentUser(input.request, input.reply);
  if (!currentUser) {
    return null;
  }

  const requestedHousehold = input.request.headers[HOUSEHOLD_HEADER];
  const householdId = typeof requestedHousehold === 'string' ? requestedHousehold : null;
  const access = await findHouseholdAccess({
    userId: currentUser.id,
    householdId,
  });

  if (!access) {
    await input.reply.code(403).send({
      error: 'HOUSEHOLD_ACCESS_DENIED',
      message: '无权访问该家庭空间',
    });
    return null;
  }

  const minimumRole = input.minimumRole ?? 'viewer';
  if (!householdRoleMeetsMinimum(access.role, minimumRole)) {
    await input.reply.code(403).send({
      error: 'HOUSEHOLD_ROLE_REQUIRED',
      message: minimumRole === 'owner' ? '仅家庭所有者可以执行此操作' : '当前角色没有编辑权限',
    });
    return null;
  }

  return {
    ...access,
    userId: currentUser.id,
  };
}
