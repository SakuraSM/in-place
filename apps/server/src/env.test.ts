import { describe, expect, it } from 'vitest';
import { getAllowedAiBaseUrls, readEnv } from './env.js';

const base = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:password@db/app',
  CORS_ORIGIN: 'https://app.example.com',
  PUBLIC_ORIGIN: 'https://app.example.com',
  JWT_SECRET: 'jwt-secret-that-is-long-and-random-enough',
  APP_ENCRYPTION_KEY: 'separate-encryption-secret-long-and-random',
  AI_PROVIDER_ALLOWED_BASE_URLS: 'https://api.openai.com/v1',
};

describe('production environment security preflight', () => {
  it('requires independent production secrets and a public origin', () => {
    expect(() => readEnv({ ...base, PUBLIC_ORIGIN: undefined })).toThrow('PUBLIC_ORIGIN');
    expect(() => readEnv({ ...base, APP_ENCRYPTION_KEY: undefined })).toThrow('APP_ENCRYPTION_KEY');
  });

  it('rejects published placeholder secrets', () => {
    expect(() => readEnv({
      ...base,
      JWT_SECRET: 'replace-with-a-random-32-character-secret',
    })).toThrow('Published placeholder secrets');
    expect(() => readEnv({
      ...base,
      JWT_SECRET: '<generate-a-strong-random-secret-of-at-least-32-characters>',
    })).toThrow('Published placeholder secrets');
  });

  it('requires independent signing and encryption secrets', () => {
    expect(() => readEnv({
      ...base,
      APP_ENCRYPTION_KEY: base.JWT_SECRET,
    })).toThrow('must be independent');
  });

  it('normalizes and deduplicates allowed AI base URLs', () => {
    const env = readEnv({
      ...base,
      OPENAI_BASE_URL: 'https://api.openai.com/v1/',
      AI_PROVIDER_ALLOWED_BASE_URLS: 'https://api.openai.com/v1,https://provider.example/v1/',
    });
    expect(getAllowedAiBaseUrls(env)).toEqual([
      'https://api.openai.com/v1',
      'https://provider.example/v1',
    ]);
  });

  it('requires a credential-free HTTPS public origin in production', () => {
    expect(() => readEnv({ ...base, PUBLIC_ORIGIN: 'http://app.example.com' }))
      .toThrow('PUBLIC_ORIGIN must be an HTTPS URL');
    expect(() => readEnv({ ...base, PUBLIC_ORIGIN: 'https://user:pass@app.example.com' }))
      .toThrow('PUBLIC_ORIGIN must be an HTTPS URL');
    expect(() => readEnv({ ...base, PUBLIC_ORIGIN: 'https://app.example.com/base' }))
      .toThrow('PUBLIC_ORIGIN must contain only scheme');
  });
});
