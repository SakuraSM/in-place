import { z } from 'zod';

const LOCAL_DEV_CORS_ORIGINS = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const DEFAULT_CORS_ORIGINS = LOCAL_DEV_CORS_ORIGINS.join(',');
const KNOWN_PLACEHOLDER_SECRET = 'replace-with-a-random-32-character-secret';
const PLACEHOLDER_SECRET_PATTERN = /^<[^>]+>$/;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z.string().default(DEFAULT_CORS_ORIGINS),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  APP_ENCRYPTION_KEY: z.string().min(32, 'APP_ENCRYPTION_KEY must be at least 32 characters').optional(),
  PUBLIC_ORIGIN: z.string().url().optional(),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(10),
  BACKUP_PAYLOAD_SIZE_MB: z.coerce.number().int().positive().default(100),
  OPENAI_API_KEY: z.string().trim().optional(),
  OPENAI_BASE_URL: z.string().trim().default('https://api.openai.com/v1'),
  AI_PROVIDER_ALLOWED_BASE_URLS: z.string().trim().optional(),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
  AI_MAX_RESPONSE_BYTES: z.coerce.number().int().min(16_384).max(10_485_760).default(1_048_576),
  AUTH_SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  OPENAI_MODEL: z.string().trim().default('gpt-4o'),
}).superRefine((env, context) => {
  for (const [key, value] of [
    ['JWT_SECRET', env.JWT_SECRET],
    ['APP_ENCRYPTION_KEY', env.APP_ENCRYPTION_KEY],
  ] as const) {
    if (value === KNOWN_PLACEHOLDER_SECRET || value && PLACEHOLDER_SECRET_PATTERN.test(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: 'Published placeholder secrets are not allowed',
      });
    }
  }
  if (env.NODE_ENV === 'production') {
    if (!env.APP_ENCRYPTION_KEY) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['APP_ENCRYPTION_KEY'], message: 'APP_ENCRYPTION_KEY is required in production' });
    }
    if (!env.PUBLIC_ORIGIN) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['PUBLIC_ORIGIN'], message: 'PUBLIC_ORIGIN is required in production' });
    }
    if (!env.AI_PROVIDER_ALLOWED_BASE_URLS) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['AI_PROVIDER_ALLOWED_BASE_URLS'], message: 'AI_PROVIDER_ALLOWED_BASE_URLS is required in production' });
    }
    if (env.APP_ENCRYPTION_KEY === env.JWT_SECRET) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['APP_ENCRYPTION_KEY'], message: 'APP_ENCRYPTION_KEY must be independent from JWT_SECRET' });
    }
    if (env.PUBLIC_ORIGIN) {
      const publicOrigin = new URL(env.PUBLIC_ORIGIN);
      if (publicOrigin.protocol !== 'https:' || publicOrigin.username || publicOrigin.password) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PUBLIC_ORIGIN'],
          message: 'PUBLIC_ORIGIN must be an HTTPS URL without credentials in production',
        });
      }
      if (publicOrigin.pathname !== '/' || publicOrigin.search || publicOrigin.hash) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PUBLIC_ORIGIN'],
          message: 'PUBLIC_ORIGIN must contain only scheme, host, and optional port',
        });
      }
    }
  }
  try {
    const candidates = [env.OPENAI_BASE_URL, ...(env.AI_PROVIDER_ALLOWED_BASE_URLS?.split(',') ?? [])];
    for (const candidate of candidates.map((value) => value.trim()).filter(Boolean)) {
      if (new URL(candidate).protocol !== 'https:') throw new Error();
    }
  } catch {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['AI_PROVIDER_ALLOWED_BASE_URLS'], message: 'AI Provider addresses must be valid HTTPS URLs' });
  }
});

export type AppEnv = z.infer<typeof envSchema>;

export function readEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(env);
}

export function parseCorsOrigins(corsOrigin: string) {
  return corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAllowedCorsOrigins(env: Pick<AppEnv, 'NODE_ENV' | 'CORS_ORIGIN'>) {
  const configuredOrigins = parseCorsOrigins(env.CORS_ORIGIN);

  if (env.NODE_ENV === 'production') {
    return configuredOrigins;
  }

  return Array.from(new Set([...LOCAL_DEV_CORS_ORIGINS, ...configuredOrigins]));
}

export function getPublicOrigin(env: Pick<AppEnv, 'PUBLIC_ORIGIN' | 'CORS_ORIGIN'>) {
  const configured = env.PUBLIC_ORIGIN || parseCorsOrigins(env.CORS_ORIGIN)[0] || 'http://localhost:8080';
  return new URL(configured).origin;
}

export function getAllowedAiBaseUrls(env: Pick<AppEnv, 'OPENAI_BASE_URL' | 'AI_PROVIDER_ALLOWED_BASE_URLS'>) {
  const configured = env.AI_PROVIDER_ALLOWED_BASE_URLS
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean) ?? [];
  return Array.from(new Set([env.OPENAI_BASE_URL, ...configured].map(normalizeBaseUrl)));
}

export function normalizeBaseUrl(value: string) {
  const url = new URL(value);
  url.hash = '';
  url.search = '';
  return url.toString().replace(/\/+$/, '');
}
