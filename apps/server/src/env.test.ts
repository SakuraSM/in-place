import { describe, expect, it } from 'vitest';
import { getAllowedAiBaseUrls, getPublicOrigin, readEnv } from './env.js';

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
  it('requires independent production secrets', () => {
    expect(() => readEnv({ ...base, APP_ENCRYPTION_KEY: undefined })).toThrow('APP_ENCRYPTION_KEY');
  });

  it('keeps existing production containers bootable without optional deployment hints', () => {
    const env = readEnv({
      ...base,
      PUBLIC_ORIGIN: undefined,
      AI_PROVIDER_ALLOWED_BASE_URLS: undefined,
    });

    expect(getPublicOrigin(env)).toBe('https://app.example.com');
    expect(getAllowedAiBaseUrls(env)).toEqual(['https://api.openai.com/v1']);
  });

  it('treats empty optional deployment hints from Compose as unset', () => {
    const env = readEnv({
      ...base,
      PUBLIC_ORIGIN: '',
      AI_PROVIDER_ALLOWED_BASE_URLS: '',
    });

    expect(env.PUBLIC_ORIGIN).toBeUndefined();
    expect(getAllowedAiBaseUrls(env)).toEqual(['https://api.openai.com/v1']);
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

  it('requires the AMap web key and security code as a pair', () => {
    expect(() => readEnv({
      ...base,
      AMAP_JS_API_KEY: 'public-web-key',
    })).toThrow('AMAP_JS_API_KEY and AMAP_JS_SECURITY_CODE');

    expect(() => readEnv({
      ...base,
      AMAP_JS_API_KEY: 'public-web-key',
      AMAP_JS_SECURITY_CODE: 'security-code',
    })).not.toThrow();
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
