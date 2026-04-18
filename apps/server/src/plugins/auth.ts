import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { users } from '@inplace/db';
import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db.js';

type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string | null;
};

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
    };
    user: {
      sub: string;
      email: string;
    };
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser: AuthenticatedUser | null;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function authPlugin(app: FastifyInstance) {
  app.decorateRequest('currentUser', null);

  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        await reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: '登录状态已失效，请重新登录',
        });
        return;
      }

      const userId = request.user.sub;
      const [user] = await getDb()
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        await reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: '用户不存在或已被删除',
        });
        return;
      }

      request.currentUser = user;
    },
  );
}
