import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { AppEnv } from '../../env.js';
import { BoundedRateLimiter, sendRateLimit } from '../../lib/bounded-rate-limit.js';
import { buildAmapUpstreamUrl, requestAmapResource } from './amap-proxy.js';

type MapRoutesOptions = FastifyPluginOptions & {
  env: AppEnv;
};

interface AmapProxyParams {
  '*': string;
}

const HTTP_STATUS_SERVICE_UNAVAILABLE = 503;
const HTTP_STATUS_BAD_GATEWAY = 502;
const AMAP_PROXY_REQUESTS_PER_MINUTE = 120;
const AMAP_PROXY_RATE_WINDOW_MS = 60_000;

export async function mapRoutes(app: FastifyInstance, options: MapRoutesOptions) {
  const proxyRateLimiter = new BoundedRateLimiter(
    AMAP_PROXY_REQUESTS_PER_MINUTE,
    AMAP_PROXY_RATE_WINDOW_MS,
  );

  app.get('/config', async () => {
    if (!options.env.AMAP_JS_API_KEY || !options.env.AMAP_JS_SECURITY_CODE) {
      return { enabled: false as const };
    }

    return {
      enabled: true as const,
      provider: 'amap' as const,
      key: options.env.AMAP_JS_API_KEY,
      servicePath: '/v1/maps/_AMapService',
    };
  });

  app.get<{ Params: AmapProxyParams }>('/_AMapService/*', async (request, reply) => {
    if (!options.env.AMAP_JS_SECURITY_CODE) {
      return reply.code(HTTP_STATUS_SERVICE_UNAVAILABLE).send({
        error: 'AMAP_NOT_CONFIGURED',
        message: '高德地图服务尚未配置',
      });
    }

    const proxyRate = proxyRateLimiter.consume(request.ip);
    if (!proxyRate.allowed) {
      return sendRateLimit(reply, proxyRate.retryAfterSeconds);
    }

    try {
      const requestUrl = new URL(request.raw.url ?? '', 'http://localhost');
      const upstreamUrl = buildAmapUpstreamUrl({
        path: request.params['*'],
        queryString: requestUrl.searchParams.toString(),
        apiKey: options.env.AMAP_JS_API_KEY ?? '',
        securityCode: options.env.AMAP_JS_SECURITY_CODE,
      });
      const response = await requestAmapResource(upstreamUrl);
      reply.header('Content-Type', response.contentType);
      if (response.cacheControl) {
        reply.header('Cache-Control', response.cacheControl);
      }
      return reply.code(response.status).send(response.body);
    } catch (error) {
      request.log.warn({ error }, 'AMap proxy request failed');
      return reply.code(HTTP_STATUS_BAD_GATEWAY).send({
        error: 'AMAP_PROXY_FAILED',
        message: '地图服务暂时不可用',
      });
    }
  });
}
