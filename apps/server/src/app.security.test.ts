import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppEnv } from './env.js';
import { createApp } from './app.js';

const env: AppEnv = {
  NODE_ENV: 'production',
  PORT: 4000,
  DATABASE_URL: 'postgresql://test:test@localhost/test',
  CORS_ORIGIN: 'https://app.example.com',
  PUBLIC_ORIGIN: 'https://app.example.com',
  JWT_SECRET: 'test-secret-that-is-at-least-thirty-two-characters',
  APP_ENCRYPTION_KEY: 'different-encryption-secret-at-least-32-characters',
  MAX_UPLOAD_SIZE_MB: 10,
  BACKUP_PAYLOAD_SIZE_MB: 100,
  OPENAI_BASE_URL: 'https://api.openai.com/v1',
  AI_PROVIDER_ALLOWED_BASE_URLS: 'https://api.openai.com/v1',
  AI_REQUEST_TIMEOUT_MS: 30_000,
  AI_MAX_RESPONSE_BYTES: 1_048_576,
  AUTH_SESSION_TTL_DAYS: 7,
  OPENAI_MODEL: 'gpt-4o',
};

describe('production host boundary', () => {
  let temporaryRoot = '';
  let cwdSpy: ReturnType<typeof vi.spyOn> | undefined;

  afterEach(async () => {
    cwdSpy?.mockRestore();
    if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
  });

  it('rejects an unexpected Host and accepts the configured public origin', async () => {
    temporaryRoot = await mkdtemp(path.join(tmpdir(), 'inplace-host-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(temporaryRoot);
    const app = await createApp(env);
    const poisoned = await app.inject({ method: 'GET', url: '/api/v1', headers: { host: 'evil.example' } });
    expect(poisoned.statusCode).toBe(421);
    const expected = await app.inject({ method: 'GET', url: '/api/v1', headers: { host: 'app.example.com' } });
    expect(expected.statusCode).toBe(200);
    await app.close();
  });

  it('does not apply an unusable Host allowlist when PUBLIC_ORIGIN is omitted', async () => {
    temporaryRoot = await mkdtemp(path.join(tmpdir(), 'inplace-host-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(temporaryRoot);
    const app = await createApp({ ...env, PUBLIC_ORIGIN: undefined });
    const response = await app.inject({ method: 'GET', url: '/api/v1', headers: { host: '192.168.1.20:8080' } });
    expect(response.statusCode).toBe(200);
    await app.close();
  });
});
