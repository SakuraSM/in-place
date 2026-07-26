import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppEnv } from '../env.js';
import { uploadRoutes } from './uploads.js';

const TEST_USER_ID = '00000000-0000-4000-8000-000000000001';
const TEST_JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters';
const AUTH_COOKIE_NAME = 'inplace_access_token';

const env: AppEnv = {
  NODE_ENV: 'test',
  PORT: 4000,
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  CORS_ORIGIN: 'http://localhost:5173',
  JWT_SECRET: TEST_JWT_SECRET,
  MAX_UPLOAD_SIZE_MB: 10,
  BACKUP_PAYLOAD_SIZE_MB: 100,
  OPENAI_BASE_URL: 'https://api.openai.com/v1',
  OPENAI_MODEL: 'gpt-4o',
};

function buildMultipartBody(input: {
  boundary: string;
  filename: string;
  mimeType: string;
  content: Buffer;
}) {
  return Buffer.concat([
    Buffer.from(
      `--${input.boundary}\r\n`
      + `Content-Disposition: form-data; name="file"; filename="${input.filename}"\r\n`
      + `Content-Type: ${input.mimeType}\r\n\r\n`,
    ),
    input.content,
    Buffer.from(`\r\n--${input.boundary}--\r\n`),
  ]);
}

async function createUploadTestApp() {
  const app = Fastify();
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: TEST_JWT_SECRET,
    cookie: {
      cookieName: AUTH_COOKIE_NAME,
      signed: false,
    },
  });
  app.decorateRequest('currentUser', null);
  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
      request.currentUser = {
        id: request.user.sub,
        email: 'uploader@example.com',
        displayName: 'Uploader',
      };
    } catch {
      await reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: '登录状态已失效，请重新登录',
      });
    }
  });
  await app.register(uploadRoutes, { env });
  return app;
}

async function uploadFile(input: {
  app: FastifyInstance;
  token: string;
  endpoint: '/api/v1/uploads/images' | '/api/v1/uploads/attachments';
  filename: string;
  mimeType: string;
  content: Buffer;
}) {
  const boundary = '----inplace-upload-test-boundary';
  const payload = buildMultipartBody({ boundary, ...input });
  return input.app.inject({
    method: 'POST',
    url: input.endpoint,
    headers: {
      authorization: `Bearer ${input.token}`,
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'content-length': String(payload.byteLength),
    },
    payload,
  });
}

describe('upload routes', () => {
  let app: FastifyInstance;
  let temporaryRoot: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    temporaryRoot = await mkdtemp(path.join(tmpdir(), 'inplace-uploads-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(temporaryRoot);
    app = await createUploadTestApp();
  });

  afterEach(async () => {
    await app.close();
    cwdSpy.mockRestore();
    await rm(temporaryRoot, { recursive: true, force: true });
  });

  it('uploads an image and only serves it to an authenticated request', async () => {
    const token = app.jwt.sign({ sub: TEST_USER_ID, email: 'uploader@example.com' });
    const image = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=',
      'base64',
    );
    const uploadResponse = await uploadFile({
      app,
      token,
      endpoint: '/api/v1/uploads/images',
      filename: 'pixel.png',
      mimeType: 'image/png',
      content: image,
    });

    expect(uploadResponse.statusCode).toBe(201);
    const uploadedUrl = uploadResponse.json<{ url: string }>().url;
    const uploadedPath = new URL(uploadedUrl).pathname;

    const anonymousResponse = await app.inject({ method: 'GET', url: uploadedPath });
    expect(anonymousResponse.statusCode).toBe(401);
    const anonymousVariantResponse = await app.inject({
      method: 'GET',
      url: `${uploadedPath}?w=96&format=webp`,
    });
    expect(anonymousVariantResponse.statusCode).toBe(401);

    const authenticatedResponse = await app.inject({
      method: 'GET',
      url: uploadedPath,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(authenticatedResponse.statusCode).toBe(200);
    expect(authenticatedResponse.rawPayload).toEqual(image);
    expect(authenticatedResponse.headers['cache-control']).toBe('private, no-store');
  });

  it('protects attachments and accepts an authenticated cookie', async () => {
    const token = app.jwt.sign({ sub: TEST_USER_ID, email: 'uploader@example.com' });
    const attachment = Buffer.from('private warranty document');
    const uploadResponse = await uploadFile({
      app,
      token,
      endpoint: '/api/v1/uploads/attachments',
      filename: 'warranty.txt',
      mimeType: 'text/plain',
      content: attachment,
    });

    expect(uploadResponse.statusCode).toBe(201);
    const uploadedPath = new URL(uploadResponse.json<{ url: string }>().url).pathname;

    const anonymousResponse = await app.inject({ method: 'HEAD', url: uploadedPath });
    expect(anonymousResponse.statusCode).toBe(401);

    const authenticatedResponse = await app.inject({
      method: 'GET',
      url: uploadedPath,
      cookies: { [AUTH_COOKIE_NAME]: token },
    });
    expect(authenticatedResponse.statusCode).toBe(200);
    expect(authenticatedResponse.body).toBe(attachment.toString());
    expect(authenticatedResponse.headers['cache-control']).toBe('private, no-store');
  });
});
