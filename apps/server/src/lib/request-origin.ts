import type { FastifyRequest } from 'fastify';

function firstHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function resolveRequestOrigin(request: FastifyRequest) {
  const forwardedProto = firstHeaderValue(request.headers['x-forwarded-proto'])?.split(',')[0]?.trim();
  const forwardedHost = firstHeaderValue(request.headers['x-forwarded-host'])?.split(',')[0]?.trim();
  const forwardedPort = firstHeaderValue(request.headers['x-forwarded-port'])?.split(',')[0]?.trim();
  const host = forwardedHost || firstHeaderValue(request.headers.host)?.trim() || 'localhost';
  const protocol = forwardedProto || request.protocol || 'http';

  if (host.includes(':') || !forwardedPort) {
    return `${protocol}://${host}`;
  }

  const omitPort = (protocol === 'http' && forwardedPort === '80')
    || (protocol === 'https' && forwardedPort === '443');

  return `${protocol}://${host}${omitPort ? '' : `:${forwardedPort}`}`;
}
