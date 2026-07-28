import { lookup } from 'node:dns/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppEnv } from '../env.js';
import {
  assertAllowedAiProviderUrl,
  isPrivateAddress,
  safeAiJsonRequest,
  readBoundedChunks,
  UnsafeAiProviderError,
} from './safe-ai-http.js';

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async () => [{ address: '8.8.8.8', family: 4 }]),
}));

const env: AppEnv = {
  NODE_ENV: 'test',
  PORT: 4000,
  DATABASE_URL: 'postgresql://test:test@localhost/test',
  CORS_ORIGIN: 'https://app.example.com',
  PUBLIC_ORIGIN: 'https://app.example.com',
  JWT_SECRET: 'test-secret-that-is-at-least-thirty-two-characters',
  APP_ENCRYPTION_KEY: 'different-encryption-secret-at-least-32-characters',
  MAX_UPLOAD_SIZE_MB: 10,
  BACKUP_PAYLOAD_SIZE_MB: 100,
  OPENAI_BASE_URL: 'https://api.example.com/v1',
  AI_PROVIDER_ALLOWED_BASE_URLS: 'https://api.example.com/v1',
  AI_REQUEST_TIMEOUT_MS: 30_000,
  AI_MAX_RESPONSE_BYTES: 128,
  AUTH_SESSION_TTL_DAYS: 7,
  OPENAI_MODEL: 'test-model',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(lookup).mockClear();
});

describe('safe AI HTTP boundary', () => {
  it('classifies local and private addresses', () => {
    expect(isPrivateAddress('127.0.0.1')).toBe(true);
    expect(isPrivateAddress('10.1.2.3')).toBe(true);
    expect(isPrivateAddress('169.254.169.254')).toBe(true);
    expect(isPrivateAddress('::1')).toBe(true);
    expect(isPrivateAddress('8.8.8.8')).toBe(false);
  });

  it('accepts only allowlisted HTTPS provider paths', () => {
    expect(assertAllowedAiProviderUrl('https://api.example.com/v1/chat/completions', env).host)
      .toBe('api.example.com');
    expect(() => assertAllowedAiProviderUrl('https://evil.example/v1', env))
      .toThrow(UnsafeAiProviderError);
    expect(() => assertAllowedAiProviderUrl('http://api.example.com/v1', env))
      .toThrow(UnsafeAiProviderError);
  });

  it('rejects redirects outside the allowlist', async () => {
    const transport = vi.fn(async () => ({
      status: 302,
      headers: new Headers({ location: 'https://evil.example/collect' }),
      bytes: Buffer.alloc(0),
    }));
    await expect(safeAiJsonRequest('https://api.example.com/v1/chat/completions', {
      method: 'POST',
    }, env, transport)).rejects.toThrow(UnsafeAiProviderError);
  });

  it('never forwards credentials across allowlisted origins', async () => {
    const multiProviderEnv = {
      ...env,
      AI_PROVIDER_ALLOWED_BASE_URLS: 'https://api.example.com/v1,https://second.example/v1',
    };
    const transport = vi.fn(async () => ({
      status: 302,
      headers: new Headers({ location: 'https://second.example/v1/collect' }),
      bytes: Buffer.alloc(0),
    }));
    await expect(safeAiJsonRequest('https://api.example.com/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: 'Bearer private-key' },
    }, multiProviderEnv, transport)).rejects.toThrow('不允许跨域重定向');
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('bounds provider response bytes and parses legitimate JSON', async () => {
    const transport = vi.fn(async () => ({
      status: 200,
      headers: new Headers(),
      bytes: Buffer.from(JSON.stringify({ ok: true })),
    }));
    const valid = await safeAiJsonRequest('https://api.example.com/v1/chat/completions', {}, env, transport);
    expect(valid.payload).toEqual({ ok: true });
    async function* oversized() {
      yield Buffer.alloc(80);
      yield Buffer.alloc(80);
    }
    await expect(readBoundedChunks(oversized(), 128))
      .rejects.toThrow('响应超过大小限制');
  });
});
