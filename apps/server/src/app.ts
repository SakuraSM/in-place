import Fastify from 'fastify';
import { mkdir } from 'node:fs/promises';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import { AUTH_COOKIE_NAME, authPlugin } from './plugins/auth.js';
import { activityRoutes } from './modules/activity/activity.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { categoryRoutes } from './modules/categories/category.routes.js';
import { healthRoutes } from './routes/health.js';
import { itemRoutes } from './modules/items/item.routes.js';
import { tagRoutes } from './modules/tags/tag.routes.js';
import { uploadRoutes } from './routes/uploads.js';
import { householdRoutes } from './modules/households/household.routes.js';
import { codeRoutes } from './modules/codes/code.routes.js';
import { stocktakeRoutes } from './modules/stocktakes/stocktake.routes.js';
import { lifecycleRoutes } from './modules/lifecycle/lifecycle.routes.js';
import { mapRoutes } from './modules/maps/map.routes.js';
import { getAllowedCorsOrigins, getPublicOrigin, type AppEnv } from './env.js';
import { resolveUploadRoot } from './lib/uploads.js';

export async function createApp(env: AppEnv) {
  await mkdir(resolveUploadRoot(env), { recursive: true });

  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
    trustProxy: 1,
    bodyLimit: env.BACKUP_PAYLOAD_SIZE_MB * 1024 * 1024,
  });

  app.addHook('onRequest', async (request, reply) => {
    if (env.NODE_ENV === 'production') {
      const expectedHost = new URL(getPublicOrigin(env)).host.toLowerCase();
      const receivedHost = request.host.toLowerCase();
      if (receivedHost !== expectedHost) {
        return reply.code(421).send({ error: 'INVALID_HOST', message: '请求 Host 不受信任' });
      }
    }
    reply
      .header('X-Content-Type-Options', 'nosniff')
      .header('X-Frame-Options', 'DENY')
      .header('Referrer-Policy', 'no-referrer')
      .header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
      .header('Cross-Origin-Resource-Policy', 'same-origin');
  });

  const allowedOrigins = new Set(getAllowedCorsOrigins(env));

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.has(origin));
    },
    credentials: true,
  });

  await app.register(fastifyCookie);

  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: AUTH_COOKIE_NAME,
      signed: false,
    },
  });

  await authPlugin(app, env);

  app.get('/api/v1', async () => ({
    service: 'inplace-server',
    status: 'ok',
  }));

  await app.register(aiRoutes, { prefix: '/api/v1/ai', env });
  await app.register(activityRoutes, { prefix: '/api/v1/activity' });
  await app.register(authRoutes, { prefix: '/api/v1/auth', env });
  await app.register(categoryRoutes, { prefix: '/api/v1/categories' });
  await app.register(codeRoutes, { prefix: '/api/v1/codes' });
  await app.register(householdRoutes, { prefix: '/api/v1/households' });
  await app.register(itemRoutes, { prefix: '/api/v1/items', env });
  await app.register(lifecycleRoutes, { prefix: '/api/v1', env });
  await app.register(mapRoutes, { prefix: '/api/v1/maps', env });
  await app.register(stocktakeRoutes, { prefix: '/api/v1/stocktakes' });
  await app.register(tagRoutes, { prefix: '/api/v1/tags' });
  await app.register(uploadRoutes, { env });
  await app.register(healthRoutes, { prefix: '/api/v1/health' });

  return app;
}
