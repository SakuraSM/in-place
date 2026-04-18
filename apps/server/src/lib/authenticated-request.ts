import type { FastifyReply, FastifyRequest } from 'fastify';

export function requireCurrentUser(request: FastifyRequest, reply: FastifyReply) {
  if (!request.currentUser) {
    reply.code(401).send({
      error: 'UNAUTHORIZED',
      message: '登录状态已失效，请重新登录',
    });
    return null;
  }

  return request.currentUser;
}
