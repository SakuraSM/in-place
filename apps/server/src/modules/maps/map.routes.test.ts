import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { readEnv } from '../../env.js';
import { mapRoutes } from './map.routes.js';

const TEST_ENVIRONMENT = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://user:password@db/app',
  JWT_SECRET: 'test-jwt-secret-that-is-long-enough-for-validation',
};
const HTTP_STATUS_OK = 200;
const HTTP_STATUS_SERVICE_UNAVAILABLE = 503;

const applications: Array<ReturnType<typeof Fastify>> = [];

async function createMapApplication(input: {
  apiKey?: string;
  securityCode?: string;
}) {
  const app = Fastify();
  applications.push(app);
  const env = readEnv({
    ...TEST_ENVIRONMENT,
    AMAP_JS_API_KEY: input.apiKey,
    AMAP_JS_SECURITY_CODE: input.securityCode,
  });
  await app.register(mapRoutes, { prefix: '/api/v1/maps', env });
  return app;
}

afterEach(async () => {
  await Promise.all(applications.splice(0).map((app) => app.close()));
});

describe('map runtime routes', () => {
  it('reports a disabled map without configured credentials', async () => {
    const app = await createMapApplication({});
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/maps/config',
    });

    expect(response.statusCode).toBe(HTTP_STATUS_OK);
    expect(response.json()).toEqual({ enabled: false });
  });

  it('returns only the public key and same-origin proxy path', async () => {
    const app = await createMapApplication({
      apiKey: 'public-web-key',
      securityCode: 'private-security-code',
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/maps/config',
    });

    expect(response.statusCode).toBe(HTTP_STATUS_OK);
    expect(response.json()).toEqual({
      enabled: true,
      provider: 'amap',
      key: 'public-web-key',
      servicePath: '/v1/maps/_AMapService',
    });
    expect(response.body).not.toContain('private-security-code');
  });

  it('does not proxy requests while the security code is absent', async () => {
    const app = await createMapApplication({});
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/maps/_AMapService/v3/geocode/regeo',
    });

    expect(response.statusCode).toBe(HTTP_STATUS_SERVICE_UNAVAILABLE);
    expect(response.json()).toMatchObject({ error: 'AMAP_NOT_CONFIGURED' });
  });
});
