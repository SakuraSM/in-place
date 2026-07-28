import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findActiveAuthSession } from '../modules/auth/auth-session.repository.js';
import { authPlugin, AUTH_COOKIE_NAME } from './auth.js';

vi.mock('../modules/auth/auth-session.repository.js', () => ({
  findActiveAuthSession: vi.fn(),
}));

vi.mock('../lib/db.js', () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{
            id: '00000000-0000-4000-8000-000000000001',
            email: 'user@example.com',
            displayName: 'User',
          }],
        }),
      }),
    }),
  }),
}));

async function createTestApp() {
  const app = Fastify();
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: 'test-secret-that-is-at-least-thirty-two-characters',
    cookie: { cookieName: AUTH_COOKIE_NAME, signed: false },
  });
  await authPlugin(app, { NODE_ENV: 'test', AUTH_SESSION_TTL_DAYS: 7 });
  app.get('/private', { preHandler: app.authenticate }, async (request) => ({
    userId: request.currentUser?.id,
  }));
  return app;
}

describe('revocable authentication sessions', () => {
  beforeEach(() => vi.mocked(findActiveAuthSession).mockReset());

  it('accepts a signed token only while its sid is active', async () => {
    const app = await createTestApp();
    vi.mocked(findActiveAuthSession).mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000010',
    } as never);
    const token = app.jwt.sign({
      sub: '00000000-0000-4000-8000-000000000001',
      email: 'user@example.com',
      sid: '00000000-0000-4000-8000-000000000010',
    }, { expiresIn: '7d' });
    const response = await app.inject({
      method: 'GET',
      url: '/private',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it('rejects legacy tokens without sid and revoked sessions', async () => {
    const app = await createTestApp();
    vi.mocked(findActiveAuthSession).mockResolvedValue(null);
    const legacyToken = app.jwt.sign({
      sub: '00000000-0000-4000-8000-000000000001',
      email: 'user@example.com',
    } as never);
    const legacy = await app.inject({
      method: 'GET',
      url: '/private',
      headers: { authorization: `Bearer ${legacyToken}` },
    });
    expect(legacy.statusCode).toBe(401);
    expect(findActiveAuthSession).not.toHaveBeenCalled();

    const revokedToken = app.jwt.sign({
      sub: '00000000-0000-4000-8000-000000000001',
      email: 'user@example.com',
      sid: '00000000-0000-4000-8000-000000000011',
    });
    const revoked = await app.inject({
      method: 'GET',
      url: '/private',
      headers: { authorization: `Bearer ${revokedToken}` },
    });
    expect(revoked.statusCode).toBe(401);
    await app.close();
  });
});
