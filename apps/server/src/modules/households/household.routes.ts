import type { FastifyPluginAsync } from 'fastify';
import { requireCurrentUser } from '../../lib/authenticated-request.js';
import { requireHouseholdAccess } from '../../lib/household-access.js';
import {
  acceptHouseholdInvite,
  createHouseholdForUser,
  createHouseholdInvite,
  listHouseholdMembers,
  listHouseholdsForUser,
  removeHouseholdMember,
  revokeHouseholdInvite,
  updateHouseholdMemberRole,
} from './household.repository.js';
import {
  acceptHouseholdInviteParamsSchema,
  createHouseholdInviteSchema,
  createHouseholdSchema,
  householdIdParamsSchema,
  householdInviteParamsSchema,
  householdMemberParamsSchema,
  updateHouseholdMemberSchema,
} from './household.schemas.js';

export const householdRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) return;

    return reply.send({ data: await listHouseholdsForUser(currentUser.id) });
  });

  app.post('/', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) return;
    const parsed = createHouseholdSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: parsed.error.issues[0]?.message });
    }

    const household = await createHouseholdForUser({
      userId: currentUser.id,
      name: parsed.data.name,
    });
    return reply.code(201).send({ data: household });
  });

  app.get('/:householdId/members', { preHandler: app.authenticate }, async (request, reply) => {
    const params = householdIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: '家庭空间参数不合法' });
    }
    const access = await requireHouseholdAccess({ request, reply });
    if (!access || access.householdId !== params.data.householdId) return;
    return reply.send({ data: await listHouseholdMembers(access.householdId) });
  });

  app.post('/:householdId/invites', { preHandler: app.authenticate }, async (request, reply) => {
    const params = householdIdParamsSchema.safeParse(request.params);
    const body = createHouseholdInviteSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: '邀请参数不合法' });
    }
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'owner' });
    if (!access || access.householdId !== params.data.householdId) return;
    const result = await createHouseholdInvite({
      householdId: access.householdId,
      userId: access.userId,
      role: body.data.role,
    });
    return reply.code(201).send({
      data: {
        token: result.token,
        id: result.invite.id,
        role: result.invite.role,
        expiresAt: result.invite.expiresAt,
      },
    });
  });

  app.delete('/:householdId/invites/:inviteId', { preHandler: app.authenticate }, async (request, reply) => {
    const params = householdInviteParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: '邀请参数不合法' });
    }
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'owner' });
    if (!access || access.householdId !== params.data.householdId) return;
    const invite = await revokeHouseholdInvite({
      householdId: access.householdId,
      inviteId: params.data.inviteId,
    });
    if (!invite) {
      return reply.code(404).send({ error: 'INVITE_NOT_FOUND', message: '邀请不存在或已失效' });
    }
    return reply.code(204).send();
  });

  app.post('/invites/:token/accept', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) return;
    const params = acceptHouseholdInviteParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: '邀请链接不合法' });
    }
    const householdId = await acceptHouseholdInvite({
      token: params.data.token,
      userId: currentUser.id,
    });
    if (!householdId) {
      return reply.code(404).send({ error: 'INVITE_NOT_FOUND', message: '邀请不存在、已使用或已过期' });
    }
    return reply.send({ data: { householdId } });
  });

  app.patch('/:householdId/members/:memberId', { preHandler: app.authenticate }, async (request, reply) => {
    const params = householdMemberParamsSchema.safeParse(request.params);
    const body = updateHouseholdMemberSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: '成员参数不合法' });
    }
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'owner' });
    if (!access || access.householdId !== params.data.householdId) return;
    const member = await updateHouseholdMemberRole({
      householdId: access.householdId,
      memberId: params.data.memberId,
      role: body.data.role,
    });
    if (!member) {
      return reply.code(404).send({ error: 'MEMBER_NOT_FOUND', message: '成员不存在或所有者角色不可修改' });
    }
    return reply.send({ data: member });
  });

  app.delete('/:householdId/members/:memberId', { preHandler: app.authenticate }, async (request, reply) => {
    const params = householdMemberParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', message: '成员参数不合法' });
    }
    const access = await requireHouseholdAccess({ request, reply, minimumRole: 'owner' });
    if (!access || access.householdId !== params.data.householdId) return;
    const member = await removeHouseholdMember({
      householdId: access.householdId,
      memberId: params.data.memberId,
    });
    if (!member) {
      return reply.code(404).send({ error: 'MEMBER_NOT_FOUND', message: '成员不存在或所有者不可移除' });
    }
    return reply.code(204).send();
  });
};
