import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { users } from '@inplace/db';
import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db.js';
import type { AppEnv } from '../env.js';
import { findActiveAuthSession } from '../modules/auth/auth-session.repository.js';

export const AUTH_COOKIE_NAME = 'inplace_access_token';
const AUTH_COOKIE_PATH = '/api';

function shouldUseSecureCookie(request: FastifyRequest, env?: Pick<AppEnv, 'NODE_ENV'>) {
  return env?.NODE_ENV === 'production' || request.protocol === 'https';
}

export function setAuthCookie(
  request: FastifyRequest,
  reply: FastifyReply,
  token: string,
  env?: Pick<AppEnv, 'NODE_ENV' | 'AUTH_SESSION_TTL_DAYS'>,
) {
  reply.setCookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(request, env),
    path: AUTH_COOKIE_PATH,
    maxAge: (env?.AUTH_SESSION_TTL_DAYS ?? 7) * 24 * 60 * 60,
  });
}

export function clearAuthCookie(request: FastifyRequest, reply: FastifyReply, env?: Pick<AppEnv, 'NODE_ENV'>) {
  reply.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookie(request, env),
    path: AUTH_COOKIE_PATH,
  });
}

type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
      sid: string;
    };
    user: {
      sub: string;
      email: string;
      sid: string;
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

export async function authPlugin(app: FastifyInstance, env?: Pick<AppEnv, 'NODE_ENV' | 'AUTH_SESSION_TTL_DAYS'>) {
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
      if (!UUID_PATTERN.test(userId) || !UUID_PATTERN.test(request.user.sid)) {
        await reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: '登录状态已失效，请重新登录',
        });
        return;
      }
      const session = await findActiveAuthSession(request.user.sid, userId);
      if (!session) {
        await reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: '登录状态已失效，请重新登录',
        });
        return;
      }
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

      const authorization = request.headers.authorization;
      const bearerToken = authorization?.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length).trim()
        : null;
      if (bearerToken && !request.cookies[AUTH_COOKIE_NAME]) {
        setAuthCookie(request, reply, bearerToken, env);
      }
    },
  );
}
