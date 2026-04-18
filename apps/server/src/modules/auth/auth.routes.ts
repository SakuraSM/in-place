import type { FastifyPluginAsync } from 'fastify';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { requireCurrentUser } from '../../lib/authenticated-request.js';
import { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from './auth.schemas.js';
import { createUser, findUserByEmail, normalizeEmail, updateUserPassword, updateUserProfile } from './auth.repository.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', async (request, reply) => {
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

    const token = await reply.jwtSign({
      sub: createdUser.id,
      email: createdUser.email,
    });

    return reply.code(201).send({
      token,
      user: createdUser,
    });
  });

  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_REQUEST',
        message: parsed.error.issues[0]?.message ?? '请求参数不合法',
      });
    }

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

    const token = await reply.jwtSign({
      sub: user.id,
      email: user.email,
    });

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

    await updateUserPassword(currentUser.id, await hashPassword(parsed.data.newPassword));

    return reply.code(204).send();
  });
};
