import { z } from 'zod';

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
].join(',');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z.string().default(DEFAULT_CORS_ORIGINS),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  UPLOAD_DIR: z.string().default('./storage/uploads'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(10),
  BACKUP_PAYLOAD_SIZE_MB: z.coerce.number().int().positive().default(100),
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
