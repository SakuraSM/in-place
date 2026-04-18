import { existsSync } from 'node:fs';
import path from 'node:path';

export function loadServerEnv() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/server/.env'),
    path.resolve(process.cwd(), '../../apps/server/.env'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      process.loadEnvFile?.(candidate);
      return candidate;
    }
  }

  return null;
}
