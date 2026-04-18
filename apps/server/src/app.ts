import Fastify from 'fastify';
import { mkdir } from 'node:fs/promises';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import { authPlugin } from './plugins/auth.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { categoryRoutes } from './modules/categories/category.routes.js';
import { healthRoutes } from './routes/health.js';
import { itemRoutes } from './modules/items/item.routes.js';
import { tagRoutes } from './modules/tags/tag.routes.js';
import { uploadRoutes } from './routes/uploads.js';
import { getAllowedCorsOrigins, type AppEnv } from './env.js';
import { resolveUploadRoot } from './lib/uploads.js';

export async function createApp(env: AppEnv) {
  await mkdir(resolveUploadRoot(env), { recursive: true });

  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
    trustProxy: true,
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

  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  await authPlugin(app);

  app.get('/api/v1', async () => ({
    service: 'inplace-server',
    status: 'ok',
  }));

  await app.register(aiRoutes, { prefix: '/api/v1/ai', env });
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(categoryRoutes, { prefix: '/api/v1/categories' });
  await app.register(itemRoutes, { prefix: '/api/v1/items', env });
  await app.register(tagRoutes, { prefix: '/api/v1/tags' });
  await app.register(uploadRoutes, { env });
  await app.register(healthRoutes, { prefix: '/api/v1/health' });

  return app;
}
