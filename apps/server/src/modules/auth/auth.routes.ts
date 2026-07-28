import type { FastifyPluginAsync } from 'fastify';
import type { AppEnv } from '../../env.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { requireCurrentUser } from '../../lib/authenticated-request.js';
import { clearAuthCookie, setAuthCookie } from '../../plugins/auth.js';
import { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from './auth.schemas.js';
import { createUser, findUserByEmail, normalizeEmail, updateUserProfile } from './auth.repository.js';
import { createAuthSession, revokeAuthSession, rotatePasswordAuthSession } from './auth-session.repository.js';
import { BoundedRateLimiter, sendRateLimit } from '../../lib/bounded-rate-limit.js';

export const authRoutes: FastifyPluginAsync<{ env: AppEnv }> = async (app, options) => {
  const loginIpLimit = new BoundedRateLimiter(20, 15 * 60_000);
  const loginAccountLimit = new BoundedRateLimiter(10, 15 * 60_000);
  const registerIpLimit = new BoundedRateLimiter(5, 60 * 60_000);
  const registerGlobalLimit = new BoundedRateLimiter(100, 60 * 60_000);

  async function signSession(
    reply: Parameters<typeof setAuthCookie>[1],
    request: Parameters<typeof setAuthCookie>[0],
    user: { id: string; email: string },
    sessionId: string,
  ) {
    const token = await reply.jwtSign(
      { sub: user.id, email: user.email, sid: sessionId },
      { expiresIn: `${options.env.AUTH_SESSION_TTL_DAYS}d` },
    );
    setAuthCookie(request, reply, token, options.env);
    return token;
  }

  async function issueSession(reply: Parameters<typeof setAuthCookie>[1], request: Parameters<typeof setAuthCookie>[0], user: { id: string; email: string }) {
    const session = await createAuthSession(user.id, options.env.AUTH_SESSION_TTL_DAYS);
    return signSession(reply, request, user, session.id);
  }

  app.post('/register', async (request, reply) => {
    const ipRate = registerIpLimit.consume(request.ip);
    if (!ipRate.allowed) return sendRateLimit(reply, ipRate.retryAfterSeconds);
    const globalRate = registerGlobalLimit.consume('global');
    if (!globalRate.allowed) return sendRateLimit(reply, globalRate.retryAfterSeconds);
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? '请求参数不合法',
      });
    }

    const email = normalizeEmail(parsed.data.email);
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return reply.code(409).send({
        error: 'EMAIL_ALREADY_EXISTS',
        message: '该邮箱已注册',
      });
    }

    const createdUser = await createUser({
      email,
      passwordHash: await hashPassword(parsed.data.password),
      displayName: parsed.data.displayName?.trim() || null,
    });

    if (!createdUser) {
      return reply.code(500).send({
        error: 'USER_CREATE_FAILED',
        message: '创建用户失败',
      });
    }

    const token = await issueSession(reply, request, createdUser);

    return reply.code(201).send({
      token,
      user: createdUser,
    });
  });

  app.post('/login', async (request, reply) => {
    const ipRate = loginIpLimit.consume(request.ip);
    if (!ipRate.allowed) return sendRateLimit(reply, ipRate.retryAfterSeconds);
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? '请求参数不合法',
      });
    }
    const accountKey = normalizeEmail(parsed.data.email);
    const accountRate = loginAccountLimit.consume(accountKey);
    if (!accountRate.allowed) return sendRateLimit(reply, accountRate.retryAfterSeconds);

    const user = await findUserByEmail(parsed.data.email);
    if (!user) {
      return reply.code(401).send({
        error: 'INVALID_CREDENTIALS',
        message: '邮箱或密码错误',
      });
    }

    const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!isValid) {
      return reply.code(401).send({
        error: 'INVALID_CREDENTIALS',
        message: '邮箱或密码错误',
      });
    }

    loginAccountLimit.reset(accountKey);
    const token = await issueSession(reply, request, user);

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
    });
  });

  app.get('/me', { preHandler: app.authenticate }, async (request, reply) => {
    if (!request.currentUser) {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: '登录状态已失效，请重新登录',
      });
    }

    return reply.send({
      user: request.currentUser,
    });
  });

  app.post('/logout', async (request, reply) => {
    try {
      await request.jwtVerify();
      await revokeAuthSession(request.user.sid, request.user.sub);
    } catch {
      // Clearing the browser cookie remains safe even for an expired or malformed token.
    }
    clearAuthCookie(request, reply, options.env);
    return reply.code(204).send();
  });

  app.patch('/me', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? '请求参数不合法',
      });
    }

    const updatedUser = await updateUserProfile(currentUser.id, {
      displayName: parsed.data.displayName.trim(),
    });

    if (!updatedUser) {
      return reply.code(404).send({
        error: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }

    return reply.send({
      user: updatedUser,
    });
  });

  app.put('/password', { preHandler: app.authenticate }, async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply);
    if (!currentUser) {
      return;
    }

    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? '请求参数不合法',
      });
    }

    const user = await findUserByEmail(currentUser.email);
    if (!user) {
      return reply.code(404).send({
        error: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }

    const isValid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!isValid) {
      return reply.code(400).send({
        error: 'INVALID_CURRENT_PASSWORD',
        message: '当前密码错误',
      });
    }

    const replacementSession = await rotatePasswordAuthSession({
      userId: currentUser.id,
      passwordHash: await hashPassword(parsed.data.newPassword),
      ttlDays: options.env.AUTH_SESSION_TTL_DAYS,
    });
    const token = await signSession(
      reply,
      request,
      { id: currentUser.id, email: currentUser.email },
      replacementSession.id,
    );
    return reply.send({ token });
  });
};
